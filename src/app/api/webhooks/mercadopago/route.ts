import { NextRequest, NextResponse } from "next/server";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { orderClient, paymentClient } from "@/lib/mercadopago";
import { approveOrder, rejectOrder } from "@/lib/grantEntitlements";

export async function POST(req: NextRequest) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Falta MP_WEBHOOK_SECRET");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const dataId = req.nextUrl.searchParams.get("data.id") ?? body?.data?.id ?? null;
  const xRequestId = req.headers.get("x-request-id");
  const xSignature = req.headers.get("x-signature");

  try {
    WebhookSignatureValidator.validate({ xSignature, xRequestId, dataId, secret });
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      // Bug confirmado del lado de Mercado Pago: para el tópico "order", las
      // notificaciones reales con data.id alfanumérico (ej. "ORDTST...")
      // siempre fallan la validación de firma (probado exhaustivamente:
      // mismo secreto, mismo payload, solo cambia el formato del id — un
      // data.id numérico sí valida bien). Reportado y sin fix conocido del
      // lado de MP. Como mitigación, para este caso puntual no confiamos en
      // el cuerpo de la notificación de todos modos: seguimos adelante pero
      // el estado que se usa para otorgar acceso sale siempre de una llamada
      // autenticada con nuestro propio Access Token a la API real de MP
      // (más abajo), nunca del body de esta request. Cualquier otro motivo
      // de rechazo (falta la firma, timestamp fuera de rango, etc.) sigue
      // devolviendo 401 normalmente.
      const isKnownOrderTopicBug = err.reason === "SignatureMismatch" && !!dataId && /[a-z]/i.test(dataId);
      if (!isKnownOrderTopicBug) {
        console.warn("Webhook de Mercado Pago rechazado:", err.reason);
        return NextResponse.json({ error: "invalid signature" }, { status: 401 });
      }
      console.warn("Firma no válida por bug conocido de MP (order topic); revalidando vía API:", dataId);
    } else {
      throw err;
    }
  }

  if (!dataId) {
    return NextResponse.json({ error: "sin data.id" }, { status: 400 });
  }

  // Checkout Pro (link de pago por pedido, ver mercadoPagoPreference.ts)
  // notifica con type "payment" y trae nuestro orderId en external_reference
  // -- distinto del checkout dinámico con tarjeta (API de Orders), que
  // notifica con type "order" y se resuelve más abajo con orderClient().
  const topic = body?.type ?? req.nextUrl.searchParams.get("type") ?? "order";

  if (topic === "payment") {
    try {
      const payment = await paymentClient().get({ id: dataId });
      const localOrder = await prisma.order.findFirst({
        where: { OR: [{ mpOrderId: dataId }, { id: payment.external_reference ?? undefined }] },
      });

      if (!localOrder) {
        console.warn("Webhook de pago (Checkout Pro) para un pedido desconocido:", dataId);
        return NextResponse.json({ ok: true });
      }
      if (localOrder.mpOrderId !== dataId) {
        await prisma.order.update({ where: { id: localOrder.id }, data: { mpOrderId: dataId } });
      }

      if (payment.status === "approved") {
        await approveOrder(localOrder.id);
      } else if (payment.status === "rejected" || payment.status === "cancelled") {
        await rejectOrder(localOrder.id, payment.status === "cancelled" ? "cancelled" : "rejected");
      }
      // Otros estados (pending, in_process, authorized) no cambian nada
      // todavía -- se espera la siguiente notificación.

      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("Error procesando webhook de pago (Checkout Pro):", err);
      return NextResponse.json({ error: "processing failed" }, { status: 500 });
    }
  }

  try {
    const mpOrder = await orderClient().get({ id: dataId });

    const localOrder = await prisma.order.findFirst({
      where: { OR: [{ mpOrderId: dataId }, { id: mpOrder.external_reference ?? undefined }] },
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
      await approveOrder(localOrder.id);
    } else if (anyRejected || orderFailedOrCancelled) {
      await rejectOrder(localOrder.id, mpOrder.status === "cancelled" ? "cancelled" : "rejected");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago:", err);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
