/**
 * Siembra Publicacion + ArchivoDrive desde data/matriz-web.json (generado por
 * scripts/export-matriz.py). Se corre a mano, una sola vez por cambio de
 * matriz -- no es parte del build ni del deploy.
 *
 * Uso: npx tsx scripts/seed-matriz.ts
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";

type PublicacionRow = {
  grado: number;
  ruta: string;
  periodo: string;
  publicarEl: string;
  implementaInicio: string;
  implementaFin: string;
  trimestre: string;
  mesComercial: string;
  compraQuincena: string;
  compraMes: string;
  compraTrimestre: string;
  compraCiclo: string;
  planeacionArchivo: string | null;
  fichasArchivo: string | null;
  diapositivaS01Archivo: string | null;
  diapositivaS02Archivo: string | null;
  diapositivaS03Archivo: string | null;
  seguimientoQuincenaArchivo: string | null;
  seguimientoMesArchivo: string | null;
  seguimientoTrimestreArchivo: string | null;
  seguimientoCicloArchivo: string | null;
};

type ArchivoRow = { nombreArchivo: string; tipo: string };

async function main() {
  const raw = readFileSync("data/matriz-web.json", "utf-8");
  const data = JSON.parse(raw) as { publicaciones: PublicacionRow[]; archivos: ArchivoRow[] };

  let archivosCreados = 0;
  for (const a of data.archivos) {
    const res = await prisma.archivoDrive.upsert({
      where: { nombreArchivo: a.nombreArchivo },
      update: {},
      create: { nombreArchivo: a.nombreArchivo, tipo: a.tipo },
    });
    if (res.createdAt.getTime() > Date.now() - 5000) archivosCreados++;
  }

  let publicacionesUpsertadas = 0;
  for (const p of data.publicaciones) {
    await prisma.publicacion.upsert({
      where: { grado_ruta_periodo: { grado: p.grado, ruta: p.ruta, periodo: p.periodo } },
      update: {
        publicarEl: new Date(p.publicarEl),
        implementaInicio: new Date(p.implementaInicio),
        implementaFin: new Date(p.implementaFin),
        trimestre: p.trimestre,
        mesComercial: p.mesComercial,
        compraQuincena: p.compraQuincena,
        compraMes: p.compraMes,
        compraTrimestre: p.compraTrimestre,
        compraCiclo: p.compraCiclo,
        planeacionArchivo: p.planeacionArchivo,
        fichasArchivo: p.fichasArchivo,
        diapositivaS01Archivo: p.diapositivaS01Archivo,
        diapositivaS02Archivo: p.diapositivaS02Archivo,
        diapositivaS03Archivo: p.diapositivaS03Archivo,
        seguimientoQuincenaArchivo: p.seguimientoQuincenaArchivo,
        seguimientoMesArchivo: p.seguimientoMesArchivo,
        seguimientoTrimestreArchivo: p.seguimientoTrimestreArchivo,
        seguimientoCicloArchivo: p.seguimientoCicloArchivo,
      },
      create: {
        grado: p.grado,
        ruta: p.ruta,
        periodo: p.periodo,
        publicarEl: new Date(p.publicarEl),
        implementaInicio: new Date(p.implementaInicio),
        implementaFin: new Date(p.implementaFin),
        trimestre: p.trimestre,
        mesComercial: p.mesComercial,
        compraQuincena: p.compraQuincena,
        compraMes: p.compraMes,
        compraTrimestre: p.compraTrimestre,
        compraCiclo: p.compraCiclo,
        planeacionArchivo: p.planeacionArchivo,
        fichasArchivo: p.fichasArchivo,
        diapositivaS01Archivo: p.diapositivaS01Archivo,
        diapositivaS02Archivo: p.diapositivaS02Archivo,
        diapositivaS03Archivo: p.diapositivaS03Archivo,
        seguimientoQuincenaArchivo: p.seguimientoQuincenaArchivo,
        seguimientoMesArchivo: p.seguimientoMesArchivo,
        seguimientoTrimestreArchivo: p.seguimientoTrimestreArchivo,
        seguimientoCicloArchivo: p.seguimientoCicloArchivo,
      },
    });
    publicacionesUpsertadas++;
  }

  console.log(`Publicacion: ${publicacionesUpsertadas} filas sembradas/actualizadas.`);
  console.log(`ArchivoDrive: ${data.archivos.length} nombres unicos procesados (${archivosCreados} nuevos).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
