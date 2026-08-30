/**
 * Solo lectura: recorre la carpeta local de "Ruta didáctica" (ya descargada
 * del Drive) y la contrasta contra lo que data/matriz-web.json espera para
 * Trimestre 1 (por ahora es lo unico que existe en disco). No escribe nada
 * en la base de datos ni copia archivos -- el objetivo es un reporte para
 * revisar con el usuario antes de mover un solo archivo, porque los nombres
 * reales en disco NO calzan con los nombres que documenta la matriz.
 *
 * Uso: npx tsx scripts/audit-archivos.ts "<ruta a la carpeta 'Ruta didáctica'>"
 */
import { readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_ROOT_DIR, T1_PERIODOS, walkAllGrados } from "./lib/matchArchivos";

type PublicacionRow = {
  grado: number;
  periodo: string;
  planeacionArchivo: string | null;
  fichasArchivo: string | null;
  diapositivaS01Archivo: string | null;
  diapositivaS02Archivo: string | null;
  diapositivaS03Archivo: string | null;
  seguimientoQuincenaArchivo: string | null;
};

function main() {
  const rootDir = process.argv[2] || DEFAULT_ROOT_DIR;
  const matriz = JSON.parse(readFileSync("data/matriz-web.json", "utf-8")) as { publicaciones: PublicacionRow[] };

  const allFound = walkAllGrados(rootDir);
  const confiables = allFound.filter((f) => !f.hardIssue);
  const sinUbicar = allFound.filter((f) => f.hardIssue);
  const conNota = confiables.filter((f) => f.note);

  // Huecos: para cada grado + periodo T1, que espera la matriz (union de las
  // 4 filas de ruta) vs que se encontro en disco.
  const esperadoPorGradoPeriodo = new Map<string, Set<string>>();
  for (const p of matriz.publicaciones) {
    if (!T1_PERIODOS.includes(p.periodo)) continue;
    const key = `${p.grado}|${p.periodo}`;
    const set = esperadoPorGradoPeriodo.get(key) ?? new Set<string>();
    if (p.planeacionArchivo) set.add("planeacion");
    if (p.fichasArchivo) set.add("fichas");
    if (p.diapositivaS01Archivo) set.add("diapositiva:S01");
    if (p.diapositivaS02Archivo) set.add("diapositiva:S02");
    if (p.diapositivaS03Archivo) set.add("diapositiva:S03");
    if (p.seguimientoQuincenaArchivo) set.add("seguimiento:quincena");
    esperadoPorGradoPeriodo.set(key, set);
  }

  const encontradoPorGradoPeriodo = new Map<string, Set<string>>();
  for (const f of confiables) {
    if (!f.periodo) continue;
    const key = `${f.grado}|${f.periodo}`;
    const set = encontradoPorGradoPeriodo.get(key) ?? new Set<string>();
    set.add(f.tipo === "diapositiva" ? `diapositiva:${f.slot}` : f.tipo === "seguimiento" ? `seguimiento:${f.subtipo}` : f.tipo);
    encontradoPorGradoPeriodo.set(key, set);
  }

  const huecos: string[] = [];
  for (const [key, esperado] of esperadoPorGradoPeriodo) {
    const encontrado = encontradoPorGradoPeriodo.get(key) ?? new Set();
    for (const slot of esperado) {
      if (!encontrado.has(slot)) {
        const [grado, periodo] = key.split("|");
        huecos.push(`grado ${grado}, ${periodo}: falta "${slot}"`);
      }
    }
  }

  const lines: string[] = [];
  lines.push(`# Auditoría de archivos reales vs matriz — ${new Date().toISOString()}`);
  lines.push(`Carpeta raíz: ${rootDir}`);
  lines.push("");
  lines.push(`## Emparejados con confianza (${confiables.length})`);
  for (const f of confiables) {
    lines.push(
      `- grado ${f.grado} · ${f.tipo}${f.subtipo ? ":" + f.subtipo : ""}${f.slot ? " " + f.slot : ""} · ${f.periodo ?? "(sin periodo)"} · ${f.path}${f.note ? `  [nota: ${f.note}]` : ""}`
    );
  }
  lines.push("");
  lines.push(`## Con nota cosmética (ya incluidos arriba, solo para visibilidad) (${conNota.length})`);
  for (const f of conNota) {
    lines.push(`- ${f.path}\n  -> ${f.note}`);
  }
  lines.push("");
  lines.push(`## Sin ubicar — necesitan revisión antes de copiar (${sinUbicar.length})`);
  for (const f of sinUbicar) {
    lines.push(`- ${f.path}\n  -> ${f.hardIssue}`);
  }
  lines.push("");
  lines.push(`## Huecos: la matriz espera un archivo para T1 y no se encontró (${huecos.length})`);
  for (const h of huecos) lines.push(`- ${h}`);

  const report = lines.join("\n");
  console.log(report);
  writeFileSync("audit-report.txt", report, "utf-8");
  console.log(
    `\n\nReporte guardado en audit-report.txt (${confiables.length} ubicados, ${sinUbicar.length} sin ubicar, ${huecos.length} huecos reales)`
  );
}

main();
