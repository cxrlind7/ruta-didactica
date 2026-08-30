import { NextRequest, NextResponse } from "next/server";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { orderClient } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Falta MP_WEBHOOK_SECRET");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const dataId = req.nextUrl.searchParams.get("data.id") ?? body?.data?.id ?? null;

  try {
    WebhookSignatureValidator.validate({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId,
      secret,
    });
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      console.warn("Webhook de Mercado Pago rechazado:", err.reason);
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
    throw err;
  }

  if (!dataId) {
    return NextResponse.json({ error: "sin data.id" }, { status: 400 });
  }

  try {
    const mpOrder = await orderClient().get({ id: dataId });

    const localOrder = await prisma.order.findFirst({
      where: { OR: [{ mpOrderId: dataId }, { id: mpOrder.external_reference ?? undefined }] },
      include: { items: true },
    });

    if (!localOrder) {
      console.warn("Webhook para una orden desconocida:", dataId);
      return NextResponse.json({ ok: true });
    }

    const payments = mpOrder.transactions?.payments ?? [];
    const anyApproved = payments.some((p) => p.status === "approved");
    const anyRejected = payments.some((p) => p.status === "rejected");

    if (anyApproved) {
      await prisma.$transaction([
        prisma.order.update({ where: { id: localOrder.id }, data: { status: "approved" } }),
        prisma.entitlement.createMany({
          data: localOrder.items.map((item) => ({
            userId: localOrder.userId,
            itemId: item.itemId,
            orderId: localOrder.id,
          })),
          skipDuplicates: true,
        }),
      ]);
    } else if (anyRejected || mpOrder.status === "cancelled") {
      await prisma.order.update({
        where: { id: localOrder.id },
        data: { status: mpOrder.status === "cancelled" ? "cancelled" : "rejected" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago:", err);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
