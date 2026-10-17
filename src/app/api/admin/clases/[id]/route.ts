import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const clase = await prisma.clase.findUnique({ where: { id } });
  if (!clase) return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const precioMXN = body?.precioMXN !== undefined ? Number(body.precioMXN) : undefined;
  const activa = typeof body?.activa === "boolean" ? body.activa : undefined;
  const titulo = typeof body?.titulo === "string" ? body.titulo.trim() : undefined;

  if (precioMXN !== undefined && (!Number.isInteger(precioMXN) || precioMXN <= 0)) {
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
  }
  if (titulo !== undefined && !titulo) {
    return NextResponse.json({ error: "El título no puede quedar vacío" }, { status: 400 });
  }

  const updated = await prisma.clase.update({
    where: { id },
    data: {
      ...(precioMXN !== undefined ? { precioMXN } : {}),
      ...(activa !== undefined ? { activa } : {}),
      ...(titulo !== undefined ? { titulo } : {}),
    },
  });

  return NextResponse.json({ clase: updated });
}
