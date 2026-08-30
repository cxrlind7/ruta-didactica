import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const { codigo } = await params;
  const producto = await prisma.paymentProduct.findUnique({ where: { codigo } });
  if (!producto) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const precioMXN = body?.precioMXN !== undefined ? Number(body.precioMXN) : undefined;
  const active = typeof body?.active === "boolean" ? body.active : undefined;

  if (precioMXN !== undefined && (!Number.isInteger(precioMXN) || precioMXN <= 0)) {
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
  }

  const updated = await prisma.paymentProduct.update({
    where: { codigo },
    data: {
      ...(precioMXN !== undefined ? { precioMXN } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });

  return NextResponse.json({ producto: updated });
}
