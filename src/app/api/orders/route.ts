import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { TEST_DOWNLOADS } from "@/lib/downloads";

type OrderBody = {
  itemIds?: unknown;
  payerEmail?: unknown;
  payerName?: unknown;
  formData?: {
    token?: unknown;
    payment_method_id?: unknown;
    issuer_id?: unknown;
    installments?: unknown;
    payment_type?: unknown;
  };
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as OrderBody | null;
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const itemIds = Array.isArray(body.itemIds) ? body.itemIds.filter((i): i is string => typeof i === "string") : [];
  const payerEmail = typeof body.payerEmail === "string" ? body.payerEmail.trim().toLowerCase() : "";
  const payerName = typeof body.payerName === "string" ? body.payerName.trim() : "";
  const token = typeof body.formData?.token === "string" ? body.formData.token : "";
  const paymentMethodId = typeof body.formData?.payment_method_id === "string" ? body.formData.payment_method_id : "";
  const installments = Number(body.formData?.installments) || 1;
  const issuerId = typeof body.formData?.issuer_id === "string" ? body.formData.issuer_id : undefined;
  const paymentType = typeof body.formData?.payment_type === "string" ? body.formData.payment_type : "credit_card";

  if (itemIds.length === 0 || itemIds.some((id) => !(id in TEST_DOWNLOADS))) {
    return NextResponse.json({ error: "Producto de prueba inválido" }, { status: 400 });
  }
  if (!payerEmail || !payerEmail.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  if (!token || !paymentMethodId) {
    return NextResponse.json({ error: "Faltan datos del pago" }, { status: 400 });
  }

  const [firstName, ...rest] = payerName ? payerName.split(" ") : [payerEmail.split("@")[0]];
  const lastName = rest.join(" ") || "Comprador";

  const user = await prisma.user.upsert({
    where: { email: payerEmail },
    update: payerName ? { name: payerName } : {},
    create: { email: payerEmail, name: payerName || undefined },
  });
  await setSession({ userId: user.id, email: user.email });

  const totalMXN = itemIds.reduce((sum, id) => sum + TEST_DOWNLOADS[id].priceMXN, 0);

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      totalMXN,
      items: {
        create: itemIds.map((itemId) => ({ itemId, priceMXN: TEST_DOWNLOADS[itemId].priceMXN })),
      },
    },
  });

  // Se usa fetch directo (no el SDK) para crear la orden: el SDK de mercadopago
  // descarta el detalle real del error cuando la API responde con la forma
  // { errors: [{ code, message }] } y solo deja "MercadoPago API error"
  // genérico, lo que hace imposible diagnosticar rechazos (p. ej. emails de
  // sandbox inválidos) desde el catch.
  const mpRes = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "X-Idempotency-Key": order.id,
    },
    body: JSON.stringify({
      type: "online",
      processing_mode: "automatic",
      capture_mode: "automatic_async",
      total_amount: totalMXN.toFixed(2),
      currency: "MXN",
      external_reference: order.id,
      description: itemIds.map((id) => TEST_DOWNLOADS[id].title).join(", "),
      payer: {
        email: payerEmail,
        first_name: firstName,
        last_name: lastName,
      },
      items: itemIds.map((itemId) => ({
        title: TEST_DOWNLOADS[itemId].title,
        unit_price: TEST_DOWNLOADS[itemId].priceMXN.toFixed(2),
        quantity: 1,
        external_code: itemId,
      })),
      transactions: {
        payments: [
          {
            amount: totalMXN.toFixed(2),
            payment_method: {
              id: paymentMethodId,
              type: paymentType,
              token,
              installments,
              ...(issuerId ? { statement_descriptor: "RUTA DIDACTICA" } : {}),
            },
          },
        ],
      },
    }),
  });

  const mpData = await mpRes.json().catch(() => ({}));

  if (!mpRes.ok) {
    console.error("Mercado Pago order create failed", mpRes.status, JSON.stringify(mpData));
    // En un rechazo (p. ej. 402 rejected_by_issuer) MP anida la orden creada
    // bajo `data`, a diferencia del 200/201 exitoso que trae los campos al
    // nivel raíz — guardamos el mpOrderId de cualquiera de las dos formas.
    const failedOrderId = mpData?.data?.id ?? mpData?.id ?? null;
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "rejected", ...(failedOrderId ? { mpOrderId: failedOrderId } : {}) },
    });
    const firstError = mpData?.errors?.[0];
    const detail =
      [firstError?.message, ...(firstError?.details ?? [])].filter(Boolean).join(" — ") ||
      mpData?.message ||
      mpData?.error ||
      "No se pudo crear la orden";
    return NextResponse.json({ error: detail, orderId: order.id }, { status: 502 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { mpOrderId: mpData.id },
  });

  return NextResponse.json({ orderId: order.id, mpStatus: mpData.status ?? "created" });
}
