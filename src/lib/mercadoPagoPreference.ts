import { preferenceClient } from "@/lib/mercadopago";
import type { ModoPago } from "@/lib/modoPago";

// Checkout Pro (a diferencia de la API de Orders usada por el pago con
// tarjeta): en vez de tokenizar una tarjeta, se crea una preferencia por
// pedido y se redirige al comprador al checkout real de Mercado Pago. A
// diferencia de los 16 enlaces fijos anteriores, cada preferencia lleva
// external_reference = nuestro orderId, así el webhook puede confirmar el
// pago automáticamente sin intervención manual.

export type CreateMpPreferenceInput = {
  mode: ModoPago;
  orderId: string;
  title: string;
  totalMXN: number;
  payerEmail: string;
  payerName?: string;
  origin: string; // p.ej. https://ruta-didactica-demo-production.up.railway.app
};

export type CreateMpPreferenceResult =
  | { ok: true; preferenceId: string; initPoint: string }
  | { ok: false; error: string };

export async function createMpPreference(input: CreateMpPreferenceInput): Promise<CreateMpPreferenceResult> {
  try {
    const preference = await preferenceClient(input.mode).create({
      body: {
        items: [
          {
            id: input.orderId,
            title: input.title,
            quantity: 1,
            unit_price: input.totalMXN,
            currency_id: "MXN",
          },
        ],
        external_reference: input.orderId,
        payer: { email: input.payerEmail, name: input.payerName },
        back_urls: {
          success: `${input.origin}/confirmacion`,
          failure: `${input.origin}/checkout`,
          pending: `${input.origin}/checkout`,
        },
        auto_return: "approved",
        notification_url: `${input.origin}/api/webhooks/mercadopago`,
      },
    });

    if (!preference.id || !preference.init_point) {
      return { ok: false, error: "Mercado Pago no devolvió un link de pago válido" };
    }
    return { ok: true, preferenceId: preference.id, initPoint: preference.init_point };
  } catch (err) {
    console.error("createMpPreference falló", err);
    const message = err instanceof Error ? err.message : "No se pudo generar el link de pago";
    return { ok: false, error: message };
  }
}
