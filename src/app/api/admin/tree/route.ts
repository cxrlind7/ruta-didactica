import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";

type Slot = {
  key: string;
  label: string;
  nombreArchivo: string;
};

type ArchivoNode = {
  key: string;
  label: string;
  nombreArchivo: string;
  archivoDriveId: string;
  ingested: boolean;
  sizeBytes: number | null;
  ingestedAt: string | null;
};

type TipoNode = { tipo: "planeacion" | "fichas" | "diapositiva" | "seguimiento"; archivos: ArchivoNode[] };
type GradoNode = { grado: number; tipos: TipoNode[] };

export async function GET() {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const publicaciones = await prisma.publicacion.findMany({ orderBy: [{ grado: "asc" }, { periodo: "asc" }] });
  const archivos = await prisma.archivoDrive.findMany();
  const archivoByNombre = new Map(archivos.map((a) => [a.nombreArchivo, a]));

  // Dedup por grado+periodo (los 4 rutas comparten el mismo archivo fisico).
  const seenGradoPeriodo = new Set<string>();
  const seenMes = new Set<string>();
  const seenTrimestre = new Set<string>();

  const gradosMap = new Map<number, { planeacion: Slot[]; fichas: Slot[]; diapositiva: Slot[]; seguimiento: Slot[] }>();
  const getGrado = (g: number) => {
    if (!gradosMap.has(g)) gradosMap.set(g, { planeacion: [], fichas: [], diapositiva: [], seguimiento: [] });
    return gradosMap.get(g)!;
  };

  for (const p of publicaciones) {
    const gpKey = `${p.grado}|${p.periodo}`;
    if (!seenGradoPeriodo.has(gpKey)) {
      seenGradoPeriodo.add(gpKey);
      const grado = getGrado(p.grado);
      if (p.planeacionArchivo) grado.planeacion.push({ key: `pl:${p.periodo}`, label: p.periodo, nombreArchivo: p.planeacionArchivo });
      if (p.fichasArchivo) grado.fichas.push({ key: `fi:${p.periodo}`, label: p.periodo, nombreArchivo: p.fichasArchivo });
      if (p.diapositivaS01Archivo)
        grado.diapositiva.push({ key: `di:${p.periodo}:S01`, label: `${p.periodo} · S01`, nombreArchivo: p.diapositivaS01Archivo });
      if (p.diapositivaS02Archivo)
        grado.diapositiva.push({ key: `di:${p.periodo}:S02`, label: `${p.periodo} · S02`, nombreArchivo: p.diapositivaS02Archivo });
      if (p.diapositivaS03Archivo)
        grado.diapositiva.push({ key: `di:${p.periodo}:S03`, label: `${p.periodo} · S03`, nombreArchivo: p.diapositivaS03Archivo });
      if (p.seguimientoQuincenaArchivo)
        grado.seguimiento.push({
          key: `sq:${p.periodo}`,
          label: `Quincena · ${p.periodo}`,
          nombreArchivo: p.seguimientoQuincenaArchivo,
        });
    }
    const mesKey = `${p.grado}|${p.mesComercial}`;
    if (!seenMes.has(mesKey) && p.seguimientoMesArchivo) {
      seenMes.add(mesKey);
      getGrado(p.grado).seguimiento.push({
        key: `sm:${p.mesComercial}`,
        label: `Mes · ${p.mesComercial}`,
        nombreArchivo: p.seguimientoMesArchivo,
      });
    }
    const triKey = `${p.grado}|${p.trimestre}`;
    if (!seenTrimestre.has(triKey) && p.seguimientoTrimestreArchivo) {
      seenTrimestre.add(triKey);
      getGrado(p.grado).seguimiento.push({
        key: `st:${p.trimestre}`,
        label: `Trimestre · ${p.trimestre}`,
        nombreArchivo: p.seguimientoTrimestreArchivo,
      });
    }
  }

  const toArchivoNode = (slot: Slot): ArchivoNode => {
    const a = archivoByNombre.get(slot.nombreArchivo);
    return {
      key: slot.key,
      label: slot.label,
      nombreArchivo: slot.nombreArchivo,
      archivoDriveId: a?.id ?? "",
      ingested: !!a?.ingestedAt,
      sizeBytes: a?.sizeBytes ?? null,
      ingestedAt: a?.ingestedAt ? a.ingestedAt.toISOString() : null,
    };
  };

  const grados: GradoNode[] = Array.from(gradosMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([grado, slots]) => ({
      grado,
      tipos: (["planeacion", "fichas", "diapositiva", "seguimiento"] as const).map((tipo) => ({
        tipo,
        archivos: slots[tipo].map(toArchivoNode),
      })),
    }));

  return NextResponse.json({ grados });
}
