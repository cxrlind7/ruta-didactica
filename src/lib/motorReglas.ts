import { ArchivoDrive, Publicacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TipoKey = "planeacion" | "fichas" | "diapositiva" | "seguimiento";

const RUTA_UNLOCKS: Record<string, TipoKey[]> = {
  BASE: ["planeacion", "fichas"],
  VISUAL: ["planeacion", "fichas", "diapositiva"],
  SEGUIMIENTO: ["planeacion", "fichas", "seguimiento"],
  INTEGRAL: ["planeacion", "fichas", "diapositiva", "seguimiento"],
};

type Granularity = "quincena" | "mes" | "trimestre";

type Entitlement = { ruta: string | null; cobertura: string | null; periodoComprado: string | null };

function coverageMatches(ent: Entitlement, granularity: Granularity, p: Publicacion): boolean {
  if (ent.cobertura === "ciclo") return true;
  if (granularity === "trimestre") return ent.cobertura === "trimestre" && ent.periodoComprado === p.trimestre;
  if (granularity === "mes") {
    return (
      (ent.cobertura === "mes" && ent.periodoComprado === p.mesComercial) ||
      (ent.cobertura === "trimestre" && ent.periodoComprado === p.trimestre)
    );
  }
  // quincena: planeacion, fichas, diapositiva, seguimiento quincenal
  return (
    (ent.cobertura === "quincena" && ent.periodoComprado === p.periodo) ||
    (ent.cobertura === "mes" && ent.periodoComprado === p.mesComercial) ||
    (ent.cobertura === "trimestre" && ent.periodoComprado === p.trimestre)
  );
}

export type AccessResult =
  | { ok: true; publicacion: Publicacion; tipo: TipoKey; archivoDrive: ArchivoDrive; orderId: string | null }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "not_ingested" }
  | { ok: false; reason: "not_published"; publicarEl: Date }
  | { ok: false; reason: "not_purchased" };

export async function checkAccess(userId: string, archivoDriveId: string): Promise<AccessResult> {
  const archivoDrive = await prisma.archivoDrive.findUnique({ where: { id: archivoDriveId } });
  if (!archivoDrive) return { ok: false, reason: "not_found" };
  if (!archivoDrive.path || !archivoDrive.ingestedAt) return { ok: false, reason: "not_ingested" };

  const tipo = archivoDrive.tipo as TipoKey;
  const nombre = archivoDrive.nombreArchivo;

  const whereByTipo = {
    planeacion: { planeacionArchivo: nombre },
    fichas: { fichasArchivo: nombre },
    diapositiva: {
      OR: [{ diapositivaS01Archivo: nombre }, { diapositivaS02Archivo: nombre }, { diapositivaS03Archivo: nombre }],
    },
    seguimiento: {
      OR: [
        { seguimientoQuincenaArchivo: nombre },
        { seguimientoMesArchivo: nombre },
        { seguimientoTrimestreArchivo: nombre },
      ],
    },
  }[tipo];

  const publicacion = await prisma.publicacion.findFirst({ where: whereByTipo });
  if (!publicacion) return { ok: false, reason: "not_found" };

  let granularity: Granularity = "quincena";
  if (tipo === "seguimiento") {
    if (publicacion.seguimientoTrimestreArchivo === nombre) granularity = "trimestre";
    else if (publicacion.seguimientoMesArchivo === nombre) granularity = "mes";
    else granularity = "quincena";
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isAdmin = user?.role === "admin";

  let publicarEl = publicacion.publicarEl;
  if (granularity === "mes") {
    const rows = await prisma.publicacion.findMany({
      where: { grado: publicacion.grado, mesComercial: publicacion.mesComercial },
      orderBy: { publicarEl: "asc" },
      take: 1,
    });
    if (rows[0]) publicarEl = rows[0].publicarEl;
  } else if (granularity === "trimestre") {
    const rows = await prisma.publicacion.findMany({
      where: { grado: publicacion.grado, trimestre: publicacion.trimestre },
      orderBy: { publicarEl: "asc" },
      take: 1,
    });
    if (rows[0]) publicarEl = rows[0].publicarEl;
  }

  if (!isAdmin && new Date() < publicarEl) {
    return { ok: false, reason: "not_published", publicarEl };
  }

  if (isAdmin) return { ok: true, publicacion, tipo, archivoDrive, orderId: null };

  const entitlements = await prisma.entitlement.findMany({ where: { userId, grado: publicacion.grado } });
  const matched = entitlements.find(
    (ent) => ent.ruta && RUTA_UNLOCKS[ent.ruta]?.includes(tipo) && coverageMatches(ent, granularity, publicacion)
  );
  if (!matched) return { ok: false, reason: "not_purchased" };

  return { ok: true, publicacion, tipo, archivoDrive, orderId: matched.orderId };
}
