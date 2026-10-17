import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grantBuyerAccess, resolveBuyer } from "@/lib/buyer";
import { resolverCompra } from "@/lib/compra";
import { createMpPreference } from "@/lib/mercadoPagoPreference";

// Checkout en modo "producción" por enlace: no tokeniza tarjeta -- registra
// el pedido (pending) -- una ruta, con el código de la matriz de 16
// productos, o una clase suelta -- y genera un link de pago real de Mercado
// Pago (Checkout Pro) específico para ese pedido, vía la API. A diferencia de un enlace
// fijo compartido por todos los compradores, esta preferencia lleva
// external_reference = nuestro orderId, así el webhook puede confirmar el
// pago automáticamente (ver /api/webhooks/mercadopago) sin depender de que
// el admin lo confirme a mano -- aunque esa confirmación manual (ver
// /api/admin/pedidos) se deja como respaldo si el webhook fallara.
// Lo que se compra -- una ruta o una clase suelta -- lo valida
// resolverCompra(), igual que en /api/checkout.
type LinkCheckoutBody = {
  payerEmail?: unknown;
  payerName?: unknown;
  [campo: string]: unknown;
};

// req.nextUrl.origin refleja la dirección interna del contenedor detrás del
// proxy de Railway (ej. http://localhost:8080), no el dominio público -- eso
// mandaba a Mercado Pago un back_urls.success inalcanzable y dejaba al
// comprador varado tras pagar, aunque el pago sí se aprobara. Los headers
// x-forwarded-* sí traen el host/proto públicos reales.
function publicOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as LinkCheckoutBody | null;
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const payerEmail = typeof body.payerEmail === "string" ? body.payerEmail.trim().toLowerCase() : "";
  const payerName = typeof body.payerName === "string" ? body.payerName.trim() : "";

  const resuelta = await resolverCompra(body);
  if (!resuelta.ok) return resuelta.response;
  const { compra } = resuelta;

  if (!payerEmail || !payerEmail.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const buyer = await resolveBuyer(payerEmail, payerName);
  if (!buyer.ok) return buyer.response;
  const { user } = buyer;

  const yaIncluida = await compra.yaIncluidaResponse(user.id);
  if (yaIncluida) return yaIncluida;

  const title = compra.titulo;
  const origin = publicOrigin(req);

  // Misma protección de doble cobro que /api/checkout: si ya hay un pedido
  // pendiente igual, se reutiliza (generando una preferencia nueva, ya que
  // las anteriores pueden haber expirado) en vez de crear otro pedido.
  const existingPending = await prisma.order.findFirst({
    where: {
      userId: user.id,
      status: "pending",
      items: { some: compra.mismoItem },
    },
  });
  if (existingPending) {
    await grantBuyerAccess(buyer, existingPending.id);
    const pref = await createMpPreference({
      mode: "produccion",
      orderId: existingPending.id,
      title,
      totalMXN: compra.priceMXN,
      payerEmail,
      payerName,
      origin,
    });
    if (!pref.ok) return NextResponse.json({ error: pref.error }, { status: 502 });
    return NextResponse.json({ orderId: existingPending.id, paymentUrl: pref.initPoint });
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      totalMXN: compra.priceMXN,
      items: { create: [{ itemId: compra.itemId, priceMXN: compra.priceMXN, ...compra.orderItem }] },
    },
  });

  await grantBuyerAccess(buyer, order.id);

  const pref = await createMpPreference({
    mode: "produccion",
    orderId: order.id,
    title,
    totalMXN: compra.priceMXN,
    payerEmail,
    payerName,
    origin,
  });
  if (!pref.ok) {
    return NextResponse.json({ error: pref.error, orderId: order.id }, { status: 502 });
  }

  return NextResponse.json({ orderId: order.id, paymentUrl: pref.initPoint });
}
