import { prisma } from "@/lib/prisma";

// Compartido entre el webhook de Mercado Pago (checkout dinamico, modo de
// pruebas) y la confirmacion manual de pedidos en el panel admin (enlaces
// fijos, modo produccion) -- ambos caminos terminan otorgando acceso de la
// misma forma exacta, para no duplicar la logica de entitlements.
export async function approveOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw new Error(`Orden no encontrada: ${orderId}`);
  if (order.status === "approved") return;

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { status: "approved" } }),
    prisma.entitlement.createMany({
      data: order.items.map((item) => ({
        userId: order.userId,
        itemId: item.itemId,
        orderId: order.id,
        grado: item.grado,
        ruta: item.ruta,
        cobertura: item.cobertura,
        periodoComprado: item.periodoComprado,
      })),
      skipDuplicates: true,
    }),
  ]);
}

export async function rejectOrder(orderId: string, status: "rejected" | "cancelled" = "rejected"): Promise<void> {
  await prisma.order.update({ where: { id: orderId }, data: { status } });
}
