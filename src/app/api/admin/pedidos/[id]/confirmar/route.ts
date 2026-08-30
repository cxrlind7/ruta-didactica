import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";
import { approveOrder } from "@/lib/grantEntitlements";

// Confirmación manual de un pedido hecho con un enlace fijo de Mercado
// Pago (modo producción) -- no hay webhook para estos, el pago se verifica
// por fuera (estado de cuenta de Mercado Pago) y el admin lo marca aquí.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  await approveOrder(id);
  return NextResponse.json({ ok: true });
}
