/**
 * Carga las clases sueltas (ver Clase en schema.prisma) desde una carpeta de
 * PDFs: crea un ArchivoDrive (tipo "clase") y una Clase a $10 por cada
 * archivo, con el título sacado del nombre del archivo. Idempotente: salta
 * los que ya existen.
 *
 * - Con VOLUME_MOUNT definido (pruebas locales), copia los PDFs ahí.
 * - Sin él, los sube al volumen de Railway con `railway volume files
 *   upload`, igual que scripts/ingest-archivos.ts.
 *
 * Uso: npx tsx scripts/ingest-clases.ts "<carpeta>" [--omitir "<archivo.pdf>"]...
 */
import "dotenv/config";
import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { prisma } from "../src/lib/prisma";

const STAGING_DIR = join("data", "staging", "clases");
const REMOTE_BASE = "/clases";
const VOLUME_NAME = "ruta-didactica-demo-volume";
const PRECIO_INICIAL = 10;

// Al descargar de Drive en Windows, ":" y "?" (no permitidos en nombres de
// archivo) quedan como "_": "Neologismos_ ¿Hablamos el mismo idioma_.pdf".
function tituloDesdeArchivo(archivo: string): string {
  let titulo = archivo.replace(/\.pdf$/i, "").replace(/_ /g, ": ");
  if (titulo.includes("¿")) titulo = titulo.replace(/_$/, "?");
  return titulo.replace(/_/g, " ").trim();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const omitir = new Set<string>();
  let carpeta = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--omitir") omitir.add(args[++i]);
    else carpeta = args[i];
  }
  if (!carpeta) throw new Error('Uso: npx tsx scripts/ingest-clases.ts "<carpeta>" [--omitir "<archivo.pdf>"]');
  return { carpeta, omitir };
}

async function main() {
  const { carpeta, omitir } = parseArgs();
  const local = process.env.VOLUME_MOUNT;

  const archivos = readdirSync(carpeta)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .sort();
  const noEncontrados = [...omitir].filter((f) => !archivos.includes(f));
  if (noEncontrados.length) throw new Error(`--omitir no coincide con ningún archivo: ${noEncontrados.join(", ")}`);

  mkdirSync(STAGING_DIR, { recursive: true });
  const plan: { titulo: string; nombreArchivo: string; origen: string; sizeBytes: number }[] = [];

  for (const archivo of archivos) {
    if (omitir.has(archivo)) {
      console.log(`Omitida: ${archivo}`);
      continue;
    }
    const titulo = tituloDesdeArchivo(archivo);
    // Nombre con el que se descarga: sin ":" ni "?" (no válidos en Windows).
    const nombreArchivo = `${titulo.replace(/: /g, " - ").replace(/[:?]/g, "")}.pdf`;
    // Se reconoce por título (no por nombreArchivo) para no duplicar clases si
    // cambia la forma de armar el nombre del archivo entre una corrida y otra.
    const existente = await prisma.clase.findFirst({ where: { titulo }, include: { archivoDrive: true } });
    if (existente?.archivoDrive.ingestedAt) continue;
    plan.push({ titulo, nombreArchivo, origen: join(carpeta, archivo), sizeBytes: statSync(join(carpeta, archivo)).size });
  }

  console.log(`Clases nuevas por cargar: ${plan.length}.`);
  if (plan.length === 0) return;

  // Primero se crean las filas (para tener el id que nombra al archivo en el
  // volumen), luego se copian/suben, y al final se marcan como cargadas.
  const creadas = [];
  for (const p of plan) {
    const archivoDrive = await prisma.archivoDrive.upsert({
      where: { nombreArchivo: p.nombreArchivo },
      update: {},
      create: { nombreArchivo: p.nombreArchivo, tipo: "clase", label: p.titulo },
    });
    await prisma.clase.upsert({
      where: { archivoDriveId: archivoDrive.id },
      update: {},
      create: { titulo: p.titulo, precioMXN: PRECIO_INICIAL, archivoDriveId: archivoDrive.id },
    });
    const remotePath = `${REMOTE_BASE}/${archivoDrive.id}.pdf`;
    if (local) {
      const destino = join(local, remotePath);
      mkdirSync(dirname(destino), { recursive: true });
      copyFileSync(p.origen, destino);
    } else {
      copyFileSync(p.origen, join(STAGING_DIR, `${archivoDrive.id}.pdf`));
    }
    creadas.push({ id: archivoDrive.id, remotePath, sizeBytes: p.sizeBytes });
  }

  if (!local) {
    console.log(`Subiendo ${STAGING_DIR} -> ${REMOTE_BASE} en el volumen ${VOLUME_NAME}...`);
    execFileSync(
      "railway",
      ["volume", "files", "--volume", VOLUME_NAME, "upload", STAGING_DIR, REMOTE_BASE, "--overwrite", "--json"],
      { stdio: "inherit", env: { ...process.env, MSYS_NO_PATHCONV: "1" }, shell: true }
    );
  }

  for (const c of creadas) {
    await prisma.archivoDrive.update({
      where: { id: c.id },
      data: { path: c.remotePath, sizeBytes: c.sizeBytes, ingestedAt: new Date() },
    });
  }

  console.log(`Listo: ${creadas.length} clases cargadas a $${PRECIO_INICIAL}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
