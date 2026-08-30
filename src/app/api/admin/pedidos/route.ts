import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";

// Listado de pedidos para el panel admin -- pensado sobre todo para
// confirmar manualmente los pedidos hechos con los enlaces fijos de
// Mercado Pago (modo producción), pero incluye todos los pedidos (también
// los del checkout dinámico de tarjeta) para tener una sola vista.
export async function GET() {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { email: true, name: true } }, items: true },
  });

  return NextResponse.json({
    pedidos: orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalMXN: o.totalMXN,
      mpOrderId: o.mpOrderId,
      createdAt: o.createdAt,
      cliente: { email: o.user.email, nombre: o.user.name },
      items: o.items.map((i) => ({
        grado: i.grado,
        ruta: i.ruta,
        cobertura: i.cobertura,
        periodoComprado: i.periodoComprado,
        paymentCode: i.paymentCode,
        priceMXN: i.priceMXN,
      })),
    })),
  });
}
