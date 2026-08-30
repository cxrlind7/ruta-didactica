// Fetch directo a la API de Orders (no el SDK de `mercadopago`): el SDK
// descarta el detalle real del error cuando la API responde con la forma
// { errors: [{ code, message }] } y solo deja "MercadoPago API error"
// genérico, lo que hace imposible diagnosticar rechazos (p. ej. emails de
// sandbox inválidos, rejected_by_issuer) desde el catch.
import { accessTokenFor } from "@/lib/mercadopago";
import type { ModoPago } from "@/lib/modoPago";

export type MpOrderItem = {
  title: string;
  unitPriceMXN: number;
  externalCode: string;
};

export type CreateMpOrderInput = {
  mode: ModoPago;
  orderId: string; // se usa como idempotency key y external_reference
  totalMXN: number;
  description: string;
  payerEmail: string;
  firstName: string;
  lastName: string;
  items: MpOrderItem[];
  token: string;
  paymentMethodId: string;
  paymentType: string;
  installments: number;
  issuerId?: string;
};

export type CreateMpOrderResult =
  | { ok: true; mpOrderId: string; status: string }
  | { ok: false; mpOrderId: string | null; error: string };

// La API de Orders solo acepta 'amex' | 'master' | 'visa' en
// transactions.payments[0].payment_method.id, pero el Brick de tarjeta
// (CardPayment) puede devolver variantes más específicas para tarjetas
// reales (ej. débito/prepago identificadas como "debmaster" en vez de
// "master") -- las tarjetas oficiales de prueba siempre devuelven el id
// base, por eso esto no se había visto hasta probar con una tarjeta real.
// Se normaliza a la red base antes de mandarlo, en vez de rechazar el pago.
function normalizePaymentMethodId(id: string): string {
  const lower = id.toLowerCase();
  if (lower.includes("amex")) return "amex";
  if (lower.includes("master")) return "master";
  if (lower.includes("visa")) return "visa";
  return id;
}

export async function createMpOrder(input: CreateMpOrderInput): Promise<CreateMpOrderResult> {
  const mpRes = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessTokenFor(input.mode)}`,
      "X-Idempotency-Key": input.orderId,
    },
    body: JSON.stringify({
      type: "online",
      processing_mode: "automatic",
      capture_mode: "automatic_async",
      total_amount: input.totalMXN.toFixed(2),
      currency: "MXN",
      external_reference: input.orderId,
      description: input.description,
      payer: {
        email: input.payerEmail,
        first_name: input.firstName,
        last_name: input.lastName,
      },
      items: input.items.map((item) => ({
        title: item.title,
        unit_price: item.unitPriceMXN.toFixed(2),
        quantity: 1,
        external_code: item.externalCode,
      })),
      transactions: {
        payments: [
          {
            amount: input.totalMXN.toFixed(2),
            payment_method: {
              id: normalizePaymentMethodId(input.paymentMethodId),
              type: input.paymentType,
              token: input.token,
              installments: input.installments,
            },
          },
        ],
      },
    }),
  });

  const mpData = await mpRes.json().catch(() => ({}));

  if (!mpRes.ok) {
    console.error(
      "Mercado Pago order create failed",
      mpRes.status,
      JSON.stringify(mpData),
      "payment_method_id enviado:",
      input.paymentMethodId
    );
    // En un rechazo (p. ej. 402 rejected_by_issuer) MP anida la orden creada
    // bajo `data`, a diferencia del 200/201 exitoso que trae los campos al
    // nivel raíz.
    const failedOrderId = mpData?.data?.id ?? mpData?.id ?? null;
    const firstError = mpData?.errors?.[0];
    const detail =
      [firstError?.message, ...(firstError?.details ?? [])].filter(Boolean).join(" — ") ||
      mpData?.message ||
      mpData?.error ||
      "No se pudo crear la orden";
    return { ok: false, mpOrderId: failedOrderId, error: detail };
  }

  return { ok: true, mpOrderId: mpData.id, status: mpData.status ?? "created" };
}
