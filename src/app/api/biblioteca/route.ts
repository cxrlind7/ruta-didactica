import { NextResponse } from "next/server";
import { Publicacion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { RUTA_UNLOCKS, TipoKey, coverageMatches, manualCoverageMatches, Granularity } from "@/lib/motorReglas";

type Slot = { tipo: TipoKey; granularity: Granularity; label: string; nombreArchivo: string };

type ArchivoOut = { archivoDriveId: string; label: string; nombreArchivo: string };
type TipoOut = { tipo: TipoKey; archivos: ArchivoOut[] };
type TrimestreOut = { trimestre: string; tipos: TipoOut[] };
type GradoOut = { grado: number; trimestres: TrimestreOut[] };

const TIPOS: TipoKey[] = ["planeacion", "fichas", "diapositiva", "seguimiento"];

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: sessionUser.userId } });
  if (!user) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });

  const isAdmin = user.role === "admin";

  const entitlements = await prisma.entitlement.findMany({
    where: { userId: user.id, grado: { not: null } },
  });

  const gradosConAcceso = Array.from(new Set(entitlements.map((e) => e.grado).filter((g): g is number => g !== null)));
  if (!isAdmin && gradosConAcceso.length === 0) {
    return NextResponse.json({ grados: [] });
  }

  const gradosAConsultar = isAdmin ? [1, 2, 3, 4, 5, 6] : gradosConAcceso;

  const publicaciones = await prisma.publicacion.findMany({ where: { grado: { in: gradosAConsultar } } });
  const archivos = await prisma.archivoDrive.findMany();
  const archivoByNombre = new Map(archivos.map((a) => [a.nombreArchivo, a]));

  // Fecha de disponibilidad minima por grado+mes y grado+trimestre (el
  // archivo consolidado se habilita con la primera quincena del tramo).
  const minPublicarElMes = new Map<string, Date>();
  const minPublicarElTrimestre = new Map<string, Date>();
  for (const p of publicaciones) {
    const mesKey = `${p.grado}|${p.mesComercial}`;
    if (!minPublicarElMes.has(mesKey) || p.publicarEl < minPublicarElMes.get(mesKey)!) {
      minPublicarElMes.set(mesKey, p.publicarEl);
    }
    const triKey = `${p.grado}|${p.trimestre}`;
    if (!minPublicarElTrimestre.has(triKey) || p.publicarEl < minPublicarElTrimestre.get(triKey)!) {
      minPublicarElTrimestre.set(triKey, p.publicarEl);
    }
  }

  function isPublished(grado: number, granularity: Granularity, p: Publicacion): boolean {
    if (isAdmin) return true;
    const now = new Date();
    if (granularity === "mes") return now >= (minPublicarElMes.get(`${grado}|${p.mesComercial}`) ?? p.publicarEl);
    if (granularity === "trimestre")
      return now >= (minPublicarElTrimestre.get(`${grado}|${p.trimestre}`) ?? p.publicarEl);
    return now >= p.publicarEl;
  }

  function hasEntitlement(grado: number, tipo: TipoKey, granularity: Granularity, p: Publicacion): boolean {
    if (isAdmin) return true;
    return entitlements.some(
      (ent) =>
        ent.grado === grado && ent.ruta && RUTA_UNLOCKS[ent.ruta]?.includes(tipo) && coverageMatches(ent, granularity, p)
    );
  }

  // grado -> trimestre -> tipo -> Slot[]
  const seenSlots = new Set<string>(); // evita duplicar archivos de mes/trimestre referenciados por varias quincenas
  const tree = new Map<number, Map<string, Map<TipoKey, Slot[]>>>();

  function addSlot(grado: number, trimestre: string, slot: Slot) {
    const dedupeKey = `${grado}|${slot.tipo}|${slot.nombreArchivo}`;
    if (seenSlots.has(dedupeKey)) return;
    seenSlots.add(dedupeKey);
    if (!tree.has(grado)) tree.set(grado, new Map());
    const trimestres = tree.get(grado)!;
    if (!trimestres.has(trimestre)) trimestres.set(trimestre, new Map());
    const tipos = trimestres.get(trimestre)!;
    if (!tipos.has(slot.tipo)) tipos.set(slot.tipo, []);
    tipos.get(slot.tipo)!.push(slot);
  }

  for (const p of publicaciones) {
    const grado = p.grado;

    const candidates: { tipo: TipoKey; granularity: Granularity; label: string; nombreArchivo: string | null }[] = [
      { tipo: "planeacion", granularity: "quincena", label: p.periodo, nombreArchivo: p.planeacionArchivo },
      { tipo: "fichas", granularity: "quincena", label: p.periodo, nombreArchivo: p.fichasArchivo },
      { tipo: "diapositiva", granularity: "quincena", label: `${p.periodo} · S01`, nombreArchivo: p.diapositivaS01Archivo },
      { tipo: "diapositiva", granularity: "quincena", label: `${p.periodo} · S02`, nombreArchivo: p.diapositivaS02Archivo },
      { tipo: "diapositiva", granularity: "quincena", label: `${p.periodo} · S03`, nombreArchivo: p.diapositivaS03Archivo },
      { tipo: "seguimiento", granularity: "quincena", label: `Quincena · ${p.periodo}`, nombreArchivo: p.seguimientoQuincenaArchivo },
      { tipo: "seguimiento", granularity: "mes", label: `Mes · ${p.mesComercial}`, nombreArchivo: p.seguimientoMesArchivo },
      { tipo: "seguimiento", granularity: "trimestre", label: `Trimestre · ${p.trimestre}`, nombreArchivo: p.seguimientoTrimestreArchivo },
    ];

    for (const c of candidates) {
      if (!c.nombreArchivo) continue;
      const archivoDrive = archivoByNombre.get(c.nombreArchivo);
      if (!archivoDrive?.ingestedAt) continue; // aun no subido, no se muestra
      if (!isPublished(grado, c.granularity, p)) continue;
      if (!hasEntitlement(grado, c.tipo, c.granularity, p)) continue;

      addSlot(grado, p.trimestre, {
        tipo: c.tipo,
        granularity: c.granularity,
        label: c.label,
        nombreArchivo: c.nombreArchivo,
      });
    }
  }

  // Archivos agregados a mano desde el panel admin: sin fila de Publicacion,
  // solo se pueden desbloquear a nivel trimestre o ciclo (no hay
  // periodo/mesComercial que comparar contra una compra de quincena/mes).
  for (const a of archivos) {
    if (!a.manual || a.grado == null || !a.trimestre || !a.ingestedAt) continue;
    if (!gradosAConsultar.includes(a.grado)) continue;
    const tipo = a.tipo as TipoKey;
    if (
      !isAdmin &&
      !entitlements.some(
        (ent) => ent.grado === a.grado && ent.ruta && RUTA_UNLOCKS[ent.ruta]?.includes(tipo) && manualCoverageMatches(ent, a.trimestre!)
      )
    ) {
      continue;
    }
    addSlot(a.grado, a.trimestre, { tipo, granularity: "trimestre", label: a.label || a.nombreArchivo, nombreArchivo: a.nombreArchivo });
  }

  const gradosOut: GradoOut[] = Array.from(tree.entries())
    .sort(([a], [b]) => a - b)
    .map(([grado, trimestres]) => ({
      grado,
      trimestres: Array.from(trimestres.entries()).map(([trimestre, tipos]) => ({
        trimestre,
        tipos: TIPOS.filter((t) => tipos.has(t)).map((tipo) => ({
          tipo,
          archivos: tipos.get(tipo)!.map((s) => ({
            archivoDriveId: archivoByNombre.get(s.nombreArchivo)!.id,
            label: s.label,
            nombreArchivo: s.nombreArchivo,
          })),
        })),
      })),
    }));

  return NextResponse.json({ grados: gradosOut });
}
