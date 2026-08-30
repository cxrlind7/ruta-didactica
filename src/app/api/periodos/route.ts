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
  const periodos: { value: string; label: string }[] = [];
  for (const p of publicaciones) {
    const value = p[columna];
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const label = cobertura === "trimestre" ? (TRIMESTRE_LABEL[value] ?? value) : cobertura === "ciclo" ? "Ciclo completo 2026-2027" : value;
    periodos.push({ value, label });
  }

  return NextResponse.json({ periodos });
}
