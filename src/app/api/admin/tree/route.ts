import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";

type TipoKey = "planeacion" | "fichas" | "diapositiva" | "seguimiento";

type Slot = {
  key: string;
  label: string;
  nombreArchivo: string;
  trimestre: string;
  tipo: TipoKey;
};

type ArchivoNode = {
  key: string;
  label: string;
  nombreArchivo: string;
  archivoDriveId: string;
  ingested: boolean;
  sizeBytes: number | null;
  ingestedAt: string | null;
  manual: boolean;
};

type TipoNode = { tipo: TipoKey; archivos: ArchivoNode[] };
type TrimestreNode = { trimestre: string; tipos: TipoNode[] };
type GradoNode = { grado: number; trimestres: TrimestreNode[] };

const TRIMESTRE_ORDEN = ["T1", "T2", "T3", "CA"];
const TIPOS: TipoKey[] = ["planeacion", "fichas", "diapositiva", "seguimiento"];

// Los slots de seguimiento se arman en el orden en que aparecen las
// publicaciones (quincena por quincena), así que Mes/Trimestre quedan
// intercalados en cualquier punto en vez de agrupados -- se reordena para
// que coincida con cómo están organizadas las carpetas reales (Mes,
// Quincena, Trimestre).
const SEGUIMIENTO_GRANULARIDAD_ORDEN: Record<string, number> = { sm: 0, sq: 1, st: 2 };
function seguimientoOrden(key: string): number {
  return SEGUIMIENTO_GRANULARIDAD_ORDEN[key.split(":")[0]] ?? 99;
}

export async function GET() {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const publicaciones = await prisma.publicacion.findMany({ orderBy: [{ grado: "asc" }, { periodo: "asc" }] });
  const archivos = await prisma.archivoDrive.findMany();
  const archivoByNombre = new Map(archivos.map((a) => [a.nombreArchivo, a]));

  // Dedup por grado+periodo (los 4 rutas comparten el mismo archivo fisico)
  // y por grado+mes / grado+trimestre para los consolidados de Seguimiento.
  const seenGradoPeriodo = new Set<string>();
  const seenMes = new Set<string>();
  const seenTrimestre = new Set<string>();
  const slotsPorGrado = new Map<number, Slot[]>();
  const getSlots = (g: number) => {
    if (!slotsPorGrado.has(g)) slotsPorGrado.set(g, []);
    return slotsPorGrado.get(g)!;
  };

  for (const p of publicaciones) {
    const gpKey = `${p.grado}|${p.periodo}`;
    if (!seenGradoPeriodo.has(gpKey)) {
      seenGradoPeriodo.add(gpKey);
      const slots = getSlots(p.grado);
      if (p.planeacionArchivo)
        slots.push({ key: `pl:${p.periodo}`, label: p.periodo, nombreArchivo: p.planeacionArchivo, trimestre: p.trimestre, tipo: "planeacion" });
      if (p.fichasArchivo)
        slots.push({ key: `fi:${p.periodo}`, label: p.periodo, nombreArchivo: p.fichasArchivo, trimestre: p.trimestre, tipo: "fichas" });
      if (p.diapositivaS01Archivo)
        slots.push({ key: `di:${p.periodo}:S01`, label: `${p.periodo} · S01`, nombreArchivo: p.diapositivaS01Archivo, trimestre: p.trimestre, tipo: "diapositiva" });
      if (p.diapositivaS02Archivo)
        slots.push({ key: `di:${p.periodo}:S02`, label: `${p.periodo} · S02`, nombreArchivo: p.diapositivaS02Archivo, trimestre: p.trimestre, tipo: "diapositiva" });
      if (p.diapositivaS03Archivo)
        slots.push({ key: `di:${p.periodo}:S03`, label: `${p.periodo} · S03`, nombreArchivo: p.diapositivaS03Archivo, trimestre: p.trimestre, tipo: "diapositiva" });
      if (p.seguimientoQuincenaArchivo)
        slots.push({
          key: `sq:${p.periodo}`,
          label: `Quincena · ${p.periodo}`,
          nombreArchivo: p.seguimientoQuincenaArchivo,
          trimestre: p.trimestre,
          tipo: "seguimiento",
        });
    }
    const mesKey = `${p.grado}|${p.mesComercial}`;
    if (!seenMes.has(mesKey) && p.seguimientoMesArchivo) {
      seenMes.add(mesKey);
      getSlots(p.grado).push({
        key: `sm:${p.mesComercial}`,
        label: `Mes · ${p.mesComercial}`,
        nombreArchivo: p.seguimientoMesArchivo,
        trimestre: p.trimestre,
        tipo: "seguimiento",
      });
    }
    const triKey = `${p.grado}|${p.trimestre}`;
    if (!seenTrimestre.has(triKey) && p.seguimientoTrimestreArchivo) {
      seenTrimestre.add(triKey);
      getSlots(p.grado).push({
        key: `st:${p.trimestre}`,
        label: `Trimestre · ${p.trimestre}`,
        nombreArchivo: p.seguimientoTrimestreArchivo,
        trimestre: p.trimestre,
        tipo: "seguimiento",
      });
    }
  }

  const toArchivoNode = (slot: Slot): ArchivoNode => {
    const a = archivoByNombre.get(slot.nombreArchivo);
    return {
      key: slot.key,
      label: a?.label || slot.label,
      nombreArchivo: slot.nombreArchivo,
      archivoDriveId: a?.id ?? "",
      ingested: !!a?.ingestedAt,
      sizeBytes: a?.sizeBytes ?? null,
      ingestedAt: a?.ingestedAt ? a.ingestedAt.toISOString() : null,
      manual: a?.manual ?? false,
    };
  };

  // Archivos agregados a mano desde el panel (no vienen de ninguna fila de
  // Publicacion): tienen su propio grado+trimestre guardados directamente.
  for (const a of archivos) {
    if (!a.manual || a.grado == null || !a.trimestre) continue;
    getSlots(a.grado).push({
      key: `manual:${a.id}`,
      label: a.label || a.nombreArchivo,
      nombreArchivo: a.nombreArchivo,
      trimestre: a.trimestre,
      tipo: a.tipo as TipoKey,
    });
  }

  const grados: GradoNode[] = Array.from(slotsPorGrado.entries())
    .sort(([a], [b]) => a - b)
    .map(([grado, slots]) => {
      const trimestresPresentes = Array.from(new Set(slots.map((s) => s.trimestre))).sort(
        (a, b) => TRIMESTRE_ORDEN.indexOf(a) - TRIMESTRE_ORDEN.indexOf(b)
      );
      return {
        grado,
        trimestres: trimestresPresentes.map((trimestre) => {
          const slotsDelTrimestre = slots.filter((s) => s.trimestre === trimestre);
          return {
            trimestre,
            tipos: TIPOS.map((tipo) => {
              const archivosDelTipo = slotsDelTrimestre.filter((s) => s.tipo === tipo);
              if (tipo === "seguimiento") {
                archivosDelTipo.sort((a, b) => seguimientoOrden(a.key) - seguimientoOrden(b.key));
              }
              return { tipo, archivos: archivosDelTipo.map(toArchivoNode) };
            }).filter((t) => t.archivos.length > 0),
          };
        }),
      };
    });

  return NextResponse.json({ grados });
}
