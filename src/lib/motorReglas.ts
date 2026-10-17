import { ArchivoDrive, Publicacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TipoKey = "planeacion" | "fichas" | "diapositiva" | "seguimiento";

export const RUTA_UNLOCKS: Record<string, TipoKey[]> = {
  BASE: ["planeacion", "fichas"],
  VISUAL: ["planeacion", "fichas", "diapositiva"],
  SEGUIMIENTO: ["planeacion", "fichas", "seguimiento"],
  INTEGRAL: ["planeacion", "fichas", "diapositiva", "seguimiento"],
};

export type Granularity = "quincena" | "mes" | "trimestre";

export type EntitlementLike = { ruta: string | null; cobertura: string | null; periodoComprado: string | null };

export function coverageMatches(ent: EntitlementLike, granularity: Granularity, p: Publicacion): boolean {
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

// Cobertura para archivos manuales (sin fila de Publicacion): no tenemos
// periodo/mesComercial, asi que solo se puede verificar a nivel trimestre o
// ciclo -- una compra de quincena/mes no alcanza a desbloquear un recurso
// manual, porque no hay forma de saber a que quincena/mes corresponde.
export function manualCoverageMatches(ent: EntitlementLike, trimestre: string): boolean {
  if (ent.cobertura === "ciclo") return true;
  return ent.cobertura === "trimestre" && ent.periodoComprado === trimestre;
}

// ¿Una compra ya otorgada (ent) incluye por completo una compra nueva? Se usa
// para no cobrar dos veces lo mismo (ver alreadyCoveredResponse en
// buyer.ts). "Por completo" quiere decir: mismo grado, la ruta ya desbloquea
// todos los tipos de la nueva, y el periodo ya cubre el nuevo -- ciclo >
// trimestre > mes > quincena, igual que en coverageMatches. Unir varias
// compras chicas no cuenta: dos quincenas no incluyen su mes, porque el mes
// también trae el seguimiento mensual. `ref` es la fila de Publicacion del
// periodo nuevo, de donde salen su trimestre y su mes.
export type Compra = { grado: number; ruta: string; cobertura: string; periodoComprado: string };

export function entitlementIncludes(
  ent: EntitlementLike & { grado: number | null },
  compra: Compra,
  ref: Pick<Publicacion, "trimestre" | "mesComercial">
): boolean {
  if (ent.grado !== compra.grado || !ent.ruta) return false;
  const tiposYaDesbloqueados = RUTA_UNLOCKS[ent.ruta] ?? [];
  if (!(RUTA_UNLOCKS[compra.ruta] ?? []).every((tipo) => tiposYaDesbloqueados.includes(tipo))) return false;

  if (ent.cobertura === "ciclo") return true;
  if (ent.cobertura === "trimestre") return compra.cobertura !== "ciclo" && ent.periodoComprado === ref.trimestre;
  if (ent.cobertura === "mes") {
    return (compra.cobertura === "mes" || compra.cobertura === "quincena") && ent.periodoComprado === ref.mesComercial;
  }
  return compra.cobertura === "quincena" && ent.periodoComprado === compra.periodoComprado;
}

export type AccessResult =
  | { ok: true; publicacion: Publicacion | null; tipo: TipoKey; archivoDrive: ArchivoDrive; orderId: string | null }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "not_ingested" }
  | { ok: false; reason: "not_published"; publicarEl: Date }
  | { ok: false; reason: "not_purchased" };

export async function checkAccess(userId: string, archivoDriveId: string): Promise<AccessResult> {
  const archivoDrive = await prisma.archivoDrive.findUnique({ where: { id: archivoDriveId } });
  if (!archivoDrive) return { ok: false, reason: "not_found" };
  if (!archivoDrive.path || !archivoDrive.ingestedAt) return { ok: false, reason: "not_ingested" };

  const tipo = archivoDrive.tipo as TipoKey;

  if (archivoDrive.manual) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "admin") return { ok: true, publicacion: null, tipo, archivoDrive, orderId: null };
    if (archivoDrive.grado == null || !archivoDrive.trimestre) return { ok: false, reason: "not_found" };

    const entitlements = await prisma.entitlement.findMany({ where: { userId, grado: archivoDrive.grado } });
    const matched = entitlements.find(
      (ent) => ent.ruta && RUTA_UNLOCKS[ent.ruta]?.includes(tipo) && manualCoverageMatches(ent, archivoDrive.trimestre!)
    );
    if (!matched) return { ok: false, reason: "not_purchased" };
    return { ok: true, publicacion: null, tipo, archivoDrive, orderId: matched.orderId };
  }

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
