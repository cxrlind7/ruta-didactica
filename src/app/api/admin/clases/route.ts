import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";

export async function GET() {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const clases = await prisma.clase.findMany({
    select: { id: true, titulo: true, materia: true, precioMXN: true, activa: true },
    orderBy: { titulo: "asc" },
  });
  return NextResponse.json({ clases });
}
