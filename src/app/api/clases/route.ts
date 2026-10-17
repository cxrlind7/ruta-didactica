import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Catálogo público de clases sueltas (ver /clases): solo las activas y con
// archivo ya cargado.
export async function GET() {
  const clases = await prisma.clase.findMany({
    where: { activa: true, archivoDrive: { ingestedAt: { not: null } } },
    select: { id: true, titulo: true, materia: true, precioMXN: true },
    orderBy: { titulo: "asc" },
  });
  return NextResponse.json({ clases });
}
