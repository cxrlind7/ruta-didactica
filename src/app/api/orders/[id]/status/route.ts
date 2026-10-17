import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuest, getSessionUser } from "@/lib/session";
import { etiquetasDeItems } from "@/lib/pedidoLabel";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getSessionUser();
  const guest = await getGuest();

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  // Un invitado (compró sin contraseña, ver buyer.ts) solo puede ver los
  // pedidos que hizo desde este navegador.
  const isOwner = !!order && sessionUser?.userId === order.userId;
  const isGuestOrder = !!order && guest?.userId === order.userId && guest.orderIds.includes(order.id);
  if (!order || (!isOwner && !isGuestOrder)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // El resumen completo solo hace falta para el checkout por link de pago
  // (Checkout Pro): esa compra sale de nuestro sitio y vuelve por
  // back_urls.success con una recarga completa, así que /confirmacion no
  // tiene forma de saber qué se compró desde el estado local del carrito
  // como sí pasa con el pago con tarjeta (que nunca sale del sitio).
  const etiquetas = await etiquetasDeItems(order.items);
  const items = order.items.map((item) => ({ id: item.id, label: etiquetas.get(item.id)!, priceMXN: item.priceMXN }));

  return NextResponse.json({
    status: order.status,
    order: { id: order.id, total: order.totalMXN, createdAt: order.createdAt, items },
  });
}
