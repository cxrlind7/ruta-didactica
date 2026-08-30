import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { TEST_DOWNLOADS } from "@/lib/downloads";
import { createMpOrder } from "@/lib/mercadoPagoOrder";

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

  const result = await createMpOrder({
    mode: "prueba",
    orderId: order.id,
    totalMXN,
    description: itemIds.map((id) => TEST_DOWNLOADS[id].title).join(", "),
    payerEmail,
    firstName,
    lastName,
    items: itemIds.map((itemId) => ({
      title: TEST_DOWNLOADS[itemId].title,
      unitPriceMXN: TEST_DOWNLOADS[itemId].priceMXN,
      externalCode: itemId,
    })),
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
