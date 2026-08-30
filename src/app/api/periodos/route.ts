import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Periodos reales disponibles para comprar, por grado + cobertura --
// sourced del calendario real (Publicacion), nunca hardcodeado (checklist
// de la especificación: "no hardcodear la composición exacta de los
// trimestres; usar calendario configurable").
const TRIMESTRE_LABEL: Record<string, string> = { T1: "Trimestre 1", T2: "Trimestre 2", T3: "Trimestre 3", CA: "Cierre anual" };
const COBERTURAS = ["quincena", "mes", "trimestre", "ciclo"] as const;
type Cobertura = (typeof COBERTURAS)[number];

function coberturaColumn(cobertura: Cobertura) {
  if (cobertura === "quincena") return "compraQuincena" as const;
  if (cobertura === "mes") return "compraMes" as const;
  if (cobertura === "trimestre") return "compraTrimestre" as const;
  return "compraCiclo" as const;
}

// "T1_Q01" -> { full: "Trimestre 1 · Quincena 1", short: "Quincena 1" };
// "CA" (cierre anual, tambien aparece como valor suelto en quincena/mes) se
// queda igual que en trimestre.
function describirPeriodo(value: string, unidad: "Quincena" | "Mes"): { full: string; short: string } {
  const letra = unidad === "Quincena" ? "Q" : "M";
  const match = value.match(new RegExp(`^(T[123])_${letra}(\\d+)$`));
  if (!match) return { full: TRIMESTRE_LABEL[value] ?? value, short: TRIMESTRE_LABEL[value] ?? value };
  const trimestre = TRIMESTRE_LABEL[match[1]] ?? match[1];
  const numero = parseInt(match[2], 10);
  return { full: `${trimestre} · ${unidad} ${numero}`, short: `${unidad} ${numero}` };
}

export async function GET(req: NextRequest) {
  const grado = Number(req.nextUrl.searchParams.get("grado"));
  const cobertura = req.nextUrl.searchParams.get("cobertura") as Cobertura | null;

  if (!Number.isInteger(grado) || grado < 1 || grado > 6) {
    return NextResponse.json({ error: "Grado inválido" }, { status: 400 });
  }
  if (!cobertura || !COBERTURAS.includes(cobertura)) {
    return NextResponse.json({ error: "Cobertura inválida" }, { status: 400 });
  }

  const columna = coberturaColumn(cobertura);
  const publicaciones = await prisma.publicacion.findMany({
    where: { grado },
    orderBy: { publicarEl: "asc" },
  });

  const seen = new Set<string>();
  const periodos: { value: string; label: string; shortLabel: string }[] = [];
  for (const p of publicaciones) {
    const value = p[columna];
    if (!value || seen.has(value)) continue;
    seen.add(value);

    let label = value;
    let shortLabel = value;
    if (cobertura === "trimestre") {
      label = TRIMESTRE_LABEL[value] ?? value;
      shortLabel = label;
    } else if (cobertura === "ciclo") {
      label = "Ciclo completo 2026-2027";
      shortLabel = label;
    } else if (cobertura === "quincena") {
      ({ full: label, short: shortLabel } = describirPeriodo(value, "Quincena"));
    } else if (cobertura === "mes") {
      ({ full: label, short: shortLabel } = describirPeriodo(value, "Mes"));
    }

    periodos.push({ value, label, shortLabel });
  }

  return NextResponse.json({ periodos });
}
