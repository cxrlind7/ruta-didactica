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
  const queryDataId = req.nextUrl.searchParams.get("data.id");
  const dataId = queryDataId ?? body?.data?.id ?? null;
  const xRequestId = req.headers.get("x-request-id");
  const xSignature = req.headers.get("x-signature");
  console.log("Webhook MP recibido:", {
    url: req.url,
    search: req.nextUrl.search,
    queryDataId,
    bodyDataId: body?.data?.id,
    dataId,
    xRequestId,
    xSignature,
    action: body?.action,
  });

  try {
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId,
      // El manifest de la firma usa data.id en minúsculas cuando contiene
      // letras (p. ej. IDs de orden como "ORDTST..."); los IDs de pago son
      // solo numéricos así que esto no los afecta.
      dataId: dataId ? dataId.toLowerCase() : dataId,
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

    // La API de Orders no usa "approved"/"rejected": un pago exitoso queda en
    // status "processed" (status_detail "accredited") y uno rechazado en
    // "failed" (status_detail p. ej. "rejected_by_issuer").
    const payments = mpOrder.transactions?.payments ?? [];
    const anyApproved = payments.some((p) => p.status === "processed") || mpOrder.status === "processed";
    const anyRejected = payments.some((p) => p.status === "failed" || p.status === "rejected");
    const orderFailedOrCancelled = mpOrder.status === "cancelled" || mpOrder.status === "failed";

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
    } else if (anyRejected || orderFailedOrCancelled) {
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
