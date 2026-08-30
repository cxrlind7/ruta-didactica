/**
 * Logica compartida para ubicar archivos reales en disco (carpeta local de
 * "Ruta didáctica") dentro del esquema grado/tipo/periodo/slot. La usan
 * audit-archivos.ts (solo lectura, genera el reporte) e
 * ingest-archivos.ts (copia lo ya confirmado). Los nombres reales en disco
 * NO calzan con los que documenta la matriz -- por eso se ubica por
 * estructura de carpeta + un parseo tolerante del nombre, nunca por match
 * exacto de string.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const GRADO_FOLDER_RE = /^0([1-6])\s/;
export const T1_PERIODOS = ["T1_Q01", "T1_Q02", "T1_Q03", "T1_Q04", "T1_Q05"];

export function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export type FoundFile = {
  path: string;
  grado: number;
  tipo: "planeacion" | "fichas" | "diapositiva" | "seguimiento";
  subtipo?: "quincena" | "mes" | "trimestre";
  periodo?: string; // T1_Q0N cuando aplica
  slot?: "S01" | "S02" | "S03";
  note?: string; // detalle cosmetico (no impide ubicar el archivo)
  hardIssue?: string; // si esta seteado, el archivo NO se pudo ubicar con confianza
};

export function extractQuincenaPeriodo(filename: string): string | undefined {
  const direct = filename.match(/T1_Q0([1-5])/);
  if (direct) return `T1_Q0${direct[1]}`;
  // Grado 5 y 6 nombran sus Diapositivas sin el prefijo "T1_" (ej. "Q01_S02_5to_...").
  const bareQ = filename.match(/(?:^|[_\s])Q0([1-5])(?:[_\s]|$)/);
  if (bareQ) return `T1_Q0${bareQ[1]}`;
  const leadingNum = filename.match(/^(\d{1,2})[\s_]/);
  if (leadingNum) {
    const n = parseInt(leadingNum[1], 10);
    if (n >= 1 && n <= 5) return `T1_Q0${n}`;
  }
  return undefined;
}

export function extractSlot(filename: string): { slot?: "S01" | "S02" | "S03"; note?: string } {
  const sMatch = filename.match(/S0([123])/);
  if (sMatch) return { slot: `S0${sMatch[1]}` as "S01" | "S02" | "S03" };
  const semanaMatch = filename.match(/Semana[_ ](\d)/i);
  if (semanaMatch && (semanaMatch[1] === "1" || semanaMatch[1] === "2")) {
    return {
      slot: `S0${semanaMatch[1]}` as "S01" | "S02",
      note: `nombre usa "Semana_${semanaMatch[1]}" en vez de "S0${semanaMatch[1]}"`,
    };
  }
  return {};
}

export function walkGrado(gradoDir: string, grado: number): FoundFile[] {
  const found: FoundFile[] = [];
  const t1Dir = join(gradoDir, "Trimestre 01");
  let tipos: string[];
  try {
    tipos = readdirSync(t1Dir);
  } catch {
    return found;
  }

  for (const tipoFolder of tipos) {
    const tipoPath = join(t1Dir, tipoFolder);
    if (!statSync(tipoPath).isDirectory()) continue;
    const tipoNorm = normalize(tipoFolder);

    if (tipoNorm.startsWith("planeacion")) {
      for (const file of readdirSync(tipoPath)) {
        if (file.startsWith("~$")) continue;
        const periodo = extractQuincenaPeriodo(file);
        found.push({
          path: join(tipoPath, file),
          grado,
          tipo: "planeacion",
          periodo,
          hardIssue: periodo ? undefined : "no se pudo derivar el periodo del nombre",
        });
      }
    } else if (tipoNorm.startsWith("ficha")) {
      for (const file of readdirSync(tipoPath)) {
        if (file.startsWith("~$")) continue;
        const periodo = extractQuincenaPeriodo(file);
        found.push({
          path: join(tipoPath, file),
          grado,
          tipo: "fichas",
          periodo,
          note: /\.pdf\.pdf$/i.test(file) ? 'extension doble ".pdf.pdf"' : undefined,
          hardIssue: periodo ? undefined : "no se pudo derivar el periodo del nombre",
        });
      }
    } else if (tipoNorm.startsWith("diapositiva")) {
      for (const file of readdirSync(tipoPath)) {
        if (file.startsWith("~$")) continue;
        const periodo = extractQuincenaPeriodo(file);
        const { slot, note: slotNote } = extractSlot(file);
        const notes = [slotNote ?? null, /\.pdf\.pdf$/i.test(file) ? 'extension doble ".pdf.pdf"' : null].filter(
          Boolean
        );
        const hardIssues = [
          !periodo ? "no se pudo derivar el periodo del nombre" : null,
          !slot ? "no se pudo derivar el slot (S01/S02/S03)" : null,
        ].filter(Boolean);
        found.push({
          path: join(tipoPath, file),
          grado,
          tipo: "diapositiva",
          periodo,
          slot,
          note: notes.length ? notes.join("; ") : undefined,
          hardIssue: hardIssues.length ? hardIssues.join("; ") : undefined,
        });
      }
    } else if (tipoNorm.startsWith("seguimiento")) {
      for (const subFolder of readdirSync(tipoPath)) {
        const subPath = join(tipoPath, subFolder);
        if (!statSync(subPath).isDirectory()) continue;
        const subNorm = normalize(subFolder);
        let subtipo: "quincena" | "mes" | "trimestre" | undefined;
        if (subNorm.includes("trimestr")) subtipo = "trimestre";
        else if (subNorm.includes("mensual") || subNorm === "mes" || subNorm.includes("mes")) subtipo = "mes";
        else if (subNorm.includes("quincen")) subtipo = "quincena";

        for (const file of readdirSync(subPath)) {
          if (file.startsWith("~$")) continue;
          const periodo = subtipo === "quincena" ? extractQuincenaPeriodo(file) : undefined;
          found.push({
            path: join(subPath, file),
            grado,
            tipo: "seguimiento",
            subtipo,
            periodo,
            hardIssue: !subtipo
              ? `no se reconoce la subcarpeta "${subFolder}" (ni trimestre/mes/quincena)`
              : subtipo === "quincena" && !periodo
                ? "no se pudo derivar el periodo del nombre"
                : undefined,
          });
        }
      }
    } else {
      for (const file of readdirSync(tipoPath)) {
        found.push({
          path: join(tipoPath, file),
          grado,
          tipo: "fichas" as never,
          hardIssue: `carpeta de tipo desconocido "${tipoFolder}"`,
        });
      }
    }
  }

  return found;
}

export function walkAllGrados(rootDir: string): FoundFile[] {
  const gradoFolders = readdirSync(rootDir).filter((f) => GRADO_FOLDER_RE.test(f));
  let allFound: FoundFile[] = [];
  for (const folder of gradoFolders) {
    const m = folder.match(GRADO_FOLDER_RE)!;
    const grado = parseInt(m[1], 10);
    allFound = allFound.concat(walkGrado(join(rootDir, folder), grado));
  }
  return allFound;
}

export const DEFAULT_ROOT_DIR = String.raw`C:\Users\CarlosOmarAldabaEstr\Desktop\Ruta didáctica-20260830T031358Z-1-001\Ruta didáctica`;
