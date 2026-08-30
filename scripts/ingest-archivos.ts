/**
 * Copia al volumen de Railway solo los archivos que audit-archivos.ts ya
 * ubicó con confianza (nunca los "sin ubicar"). Arma una carpeta de staging
 * local con nombres seguros (el id de ArchivoDrive, no el nombre real con
 * espacios/acentos) y sube todo de una sola vez con
 * `railway volume files upload`, luego actualiza ArchivoDrive.path en la
 * base de datos.
 *
 * Uso: npx tsx scripts/ingest-archivos.ts "<ruta a la carpeta 'Ruta didáctica'>"
 */
import "dotenv/config";
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { DEFAULT_ROOT_DIR, FoundFile, walkAllGrados } from "./lib/matchArchivos";

const STAGING_DIR = join("data", "staging", "publicaciones");
const REMOTE_BASE = "/publicaciones";
const VOLUME_NAME = "ruta-didactica-demo-volume";

type PublicacionRow = {
  grado: number;
  periodo: string;
  trimestre: string;
  mesComercial: string;
  planeacionArchivo: string | null;
  fichasArchivo: string | null;
  diapositivaS01Archivo: string | null;
  diapositivaS02Archivo: string | null;
  diapositivaS03Archivo: string | null;
  seguimientoQuincenaArchivo: string | null;
  seguimientoMesArchivo: string | null;
  seguimientoTrimestreArchivo: string | null;
};

function resolveNombreEsperado(
  f: FoundFile,
  byGradoPeriodo: Map<string, PublicacionRow>,
  byGradoMes: Map<string, PublicacionRow>,
  byGradoTrimestre: Map<string, PublicacionRow>
): string | undefined {
  if (f.tipo === "seguimiento" && f.subtipo === "mes") {
    if (!f.mesCodigo) return undefined;
    // Por ahora solo existe T1 en disco; el codigo mensual completo es "T1_M0N".
    const row = byGradoMes.get(`${f.grado}|T1_${f.mesCodigo}`);
    return row?.seguimientoMesArchivo ?? undefined;
  }
  if (f.tipo === "seguimiento" && f.subtipo === "trimestre") {
    const row = byGradoTrimestre.get(`${f.grado}|T1`);
    return row?.seguimientoTrimestreArchivo ?? undefined;
  }

  if (!f.periodo) return undefined;
  const row = byGradoPeriodo.get(`${f.grado}|${f.periodo}`);
  if (!row) return undefined;
  if (f.tipo === "planeacion") return row.planeacionArchivo ?? undefined;
  if (f.tipo === "fichas") return row.fichasArchivo ?? undefined;
  if (f.tipo === "diapositiva") {
    if (f.slot === "S01") return row.diapositivaS01Archivo ?? undefined;
    if (f.slot === "S02") return row.diapositivaS02Archivo ?? undefined;
    if (f.slot === "S03") return row.diapositivaS03Archivo ?? undefined;
  }
  if (f.tipo === "seguimiento" && f.subtipo === "quincena") return row.seguimientoQuincenaArchivo ?? undefined;
  return undefined;
}

function extOf(path: string) {
  // normaliza dobles extensiones como ".pdf.pdf" -> ".pdf"
  const e = extname(path);
  return e || ".bin";
}

async function main() {
  const rootDir = process.argv[2] || DEFAULT_ROOT_DIR;

  const publicaciones = await prisma.publicacion.findMany();
  const byGradoPeriodo = new Map<string, PublicacionRow>();
  const byGradoMes = new Map<string, PublicacionRow>();
  const byGradoTrimestre = new Map<string, PublicacionRow>();
  const merge = (map: Map<string, PublicacionRow>, key: string, p: (typeof publicaciones)[number]) => {
    const existing = map.get(key);
    map.set(key, {
      grado: p.grado,
      periodo: p.periodo,
      trimestre: p.trimestre,
      mesComercial: p.mesComercial,
      planeacionArchivo: existing?.planeacionArchivo ?? p.planeacionArchivo,
      fichasArchivo: existing?.fichasArchivo ?? p.fichasArchivo,
      diapositivaS01Archivo: existing?.diapositivaS01Archivo ?? p.diapositivaS01Archivo,
      diapositivaS02Archivo: existing?.diapositivaS02Archivo ?? p.diapositivaS02Archivo,
      diapositivaS03Archivo: existing?.diapositivaS03Archivo ?? p.diapositivaS03Archivo,
      seguimientoQuincenaArchivo: existing?.seguimientoQuincenaArchivo ?? p.seguimientoQuincenaArchivo,
      seguimientoMesArchivo: existing?.seguimientoMesArchivo ?? p.seguimientoMesArchivo,
      seguimientoTrimestreArchivo: existing?.seguimientoTrimestreArchivo ?? p.seguimientoTrimestreArchivo,
    });
  };
  for (const p of publicaciones) {
    merge(byGradoPeriodo, `${p.grado}|${p.periodo}`, p);
    merge(byGradoMes, `${p.grado}|${p.mesComercial}`, p);
    merge(byGradoTrimestre, `${p.grado}|${p.trimestre}`, p);
  }

  const allFound = walkAllGrados(rootDir);
  const confiables = allFound.filter((f) => !f.hardIssue);

  mkdirSync(STAGING_DIR, { recursive: true });

  type Plan = { archivoDriveId: string; nombreArchivo: string; localPath: string; remotePath: string; sizeBytes: number };
  const plan: Plan[] = [];
  const sinArchivoDrive: string[] = [];

  for (const f of confiables) {
    const nombreEsperado = resolveNombreEsperado(f, byGradoPeriodo, byGradoMes, byGradoTrimestre);
    if (!nombreEsperado) {
      sinArchivoDrive.push(`${f.path} (grado ${f.grado}, ${f.tipo}, ${f.periodo ?? "?"}) -> no hay campo esperado en Publicacion`);
      continue;
    }
    const archivoDrive = await prisma.archivoDrive.findUnique({ where: { nombreArchivo: nombreEsperado } });
    if (!archivoDrive) {
      sinArchivoDrive.push(`${f.path} -> ArchivoDrive "${nombreEsperado}" no existe (revisar seed)`);
      continue;
    }
    if (archivoDrive.ingestedAt) continue; // idempotente: ya subido antes

    const ext = extOf(f.path);
    const stagedName = `${archivoDrive.id}${ext}`;
    const localPath = join(STAGING_DIR, stagedName);
    copyFileSync(f.path, localPath);

    plan.push({
      archivoDriveId: archivoDrive.id,
      nombreArchivo: nombreEsperado,
      localPath,
      remotePath: `${REMOTE_BASE}/${stagedName}`,
      sizeBytes: statSync(f.path).size,
    });
  }

  console.log(`Preparados para subir: ${plan.length}. Sin ArchivoDrive coincidente: ${sinArchivoDrive.length}.`);
  for (const s of sinArchivoDrive) console.log(" - " + s);

  if (plan.length === 0) {
    console.log("Nada nuevo que subir.");
    return;
  }

  console.log(`Subiendo ${STAGING_DIR} -> ${REMOTE_BASE} en el volumen ${VOLUME_NAME}...`);
  execFileSync(
    "railway",
    ["volume", "files", "--volume", VOLUME_NAME, "upload", STAGING_DIR, REMOTE_BASE, "--overwrite", "--json"],
    { stdio: "inherit", env: { ...process.env, MSYS_NO_PATHCONV: "1" }, shell: true }
  );

  for (const p of plan) {
    await prisma.archivoDrive.update({
      where: { id: p.archivoDriveId },
      data: { path: p.remotePath, sizeBytes: p.sizeBytes, ingestedAt: new Date() },
    });
  }

  console.log(`Listo: ${plan.length} archivos subidos y marcados como ingestados.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
