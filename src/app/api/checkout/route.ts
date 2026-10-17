import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grantBuyerAccess, resolveBuyer } from "@/lib/buyer";
import { resolverCompra } from "@/lib/compra";
import { createMpOrder } from "@/lib/mercadoPagoOrder";
import { getModoPago } from "@/lib/modoPago";

// Checkout con tarjeta (Brick de Mercado Pago, API de Orders). Lo que se
// compra -- una ruta (grado+ruta+cobertura+periodo) o una clase suelta
// (claseId) -- lo valida resolverCompra().
type CheckoutBody = {
  payerEmail?: unknown;
  payerName?: unknown;
  formData?: {
    token?: unknown;
    payment_method_id?: unknown;
    issuer_id?: unknown;
    installments?: unknown;
    payment_type?: unknown;
  };
  [campo: string]: unknown;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as CheckoutBody | null;
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const payerEmail = typeof body.payerEmail === "string" ? body.payerEmail.trim().toLowerCase() : "";
  const payerName = typeof body.payerName === "string" ? body.payerName.trim() : "";
  const token = typeof body.formData?.token === "string" ? body.formData.token : "";
  const paymentMethodId = typeof body.formData?.payment_method_id === "string" ? body.formData.payment_method_id : "";
  const installments = Number(body.formData?.installments) || 1;
  const issuerId = typeof body.formData?.issuer_id === "string" ? body.formData.issuer_id : undefined;
  const paymentType = typeof body.formData?.payment_type === "string" ? body.formData.payment_type : "credit_card";

  const resuelta = await resolverCompra(body);
  if (!resuelta.ok) return resuelta.response;
  const { compra } = resuelta;

  if (!payerEmail || !payerEmail.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  if (!token || !paymentMethodId) {
    return NextResponse.json({ error: "Faltan datos del pago" }, { status: 400 });
  }

  const [firstName, ...rest] = payerName ? payerName.split(" ") : [payerEmail.split("@")[0]];
  const lastName = rest.join(" ") || "Comprador";

  const buyer = await resolveBuyer(payerEmail, payerName);
  if (!buyer.ok) return buyer.response;
  const { user } = buyer;

  const yaIncluida = await compra.yaIncluidaResponse(user.id);
  if (yaIncluida) return yaIncluida;

  // Protección de doble cobro: si ya hay un pedido pendiente para exactamente
  // lo mismo, no se crea uno nuevo.
  const existingPending = await prisma.order.findFirst({
    where: { userId: user.id, status: "pending", items: { some: compra.mismoItem } },
  });
  if (existingPending) {
    return NextResponse.json(
      { error: "Ya tienes un pago en proceso para esta compra", orderId: existingPending.id },
      { status: 409 }
    );
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      totalMXN: compra.priceMXN,
      items: { create: [{ itemId: compra.itemId, priceMXN: compra.priceMXN, ...compra.orderItem }] },
    },
  });

  await grantBuyerAccess(buyer, order.id);

  const mode = await getModoPago();
  const result = await createMpOrder({
    mode,
    orderId: order.id,
    totalMXN: compra.priceMXN,
    description: compra.titulo,
    payerEmail,
    firstName,
    lastName,
    items: [{ title: compra.titulo, unitPriceMXN: compra.priceMXN, externalCode: order.id }],
    token,
    paymentMethodId,
    paymentType,
    installments,
    issuerId,
  });

  if (!result.ok) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "rejected", ...(result.mpOrderId ? { mpOrderId: result.mpOrderId } : {}) },
    });
    return NextResponse.json({ error: result.error, orderId: order.id }, { status: 502 });
  }

  await prisma.order.update({ where: { id: order.id }, data: { mpOrderId: result.mpOrderId } });
  return NextResponse.json({ orderId: order.id, mpStatus: result.status });
}
