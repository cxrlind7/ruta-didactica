export const TRIMESTRE_LABEL: Record<string, string> = {
  T1: "Trimestre 1",
  T2: "Trimestre 2",
  T3: "Trimestre 3",
  CA: "Cierre anual",
};

// "T1_Q01" -> { full: "Trimestre 1 · Quincena 1", short: "Quincena 1" };
// "CA" (cierre anual, tambien aparece como valor suelto en quincena/mes) se
// queda igual que en trimestre.
export function describirPeriodo(value: string, unidad: "Quincena" | "Mes"): { full: string; short: string } {
  const letra = unidad === "Quincena" ? "Q" : "M";
  const match = value.match(new RegExp(`^(T[123])_${letra}(\\d+)$`));
  if (!match) return { full: TRIMESTRE_LABEL[value] ?? value, short: TRIMESTRE_LABEL[value] ?? value };
  const trimestre = TRIMESTRE_LABEL[match[1]] ?? match[1];
  const numero = parseInt(match[2], 10);
  return { full: `${trimestre} · ${unidad} ${numero}`, short: `${unidad} ${numero}` };
}

export type Cobertura = "quincena" | "mes" | "trimestre" | "ciclo";

export function periodoLabelFor(cobertura: Cobertura, value: string): string {
  if (cobertura === "trimestre") return TRIMESTRE_LABEL[value] ?? value;
  if (cobertura === "ciclo") return "Ciclo completo 2026-2027";
  if (cobertura === "quincena") return describirPeriodo(value, "Quincena").full;
  return describirPeriodo(value, "Mes").full;
}
