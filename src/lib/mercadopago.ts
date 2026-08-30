import { MercadoPagoConfig, Order, Payment, Preference } from "mercadopago";
import type { ModoPago } from "@/lib/modoPago";

// "Prueba" y "producción" son dos aplicaciones de Mercado Pago separadas
// (dos cuentas/apps distintas, cada una con su propio access token, public
// key y webhook secret) -- no el par TEST-/APP_USR- de una sola app, que
// probamos y no sirve aquí: las tarjetas oficiales de prueba de Mercado
// Pago son rechazadas de plano por credenciales TEST- reales ("Test
// credentials are not supported..."), solo funcionan con credenciales
// APP_USR- sin activar. Por eso "prueba" apunta a una app dedicada solo a
// probar (nunca se activa, no importa) y "producción" a la app real del
// negocio. Un recurso creado con las credenciales de una app no se puede
// consultar ni cobrar con las de la otra.
export function accessTokenFor(mode: ModoPago): string {
  const key = mode === "produccion" ? "MP_ACCESS_TOKEN_PROD" : "MP_ACCESS_TOKEN_TEST";
  const token = process.env[key];
  if (!token) throw new Error(`Falta ${key}`);
  return token;
}

export function publicKeyFor(mode: ModoPago): string | null {
  const key = mode === "produccion" ? "MP_PUBLIC_KEY_PROD" : "MP_PUBLIC_KEY_TEST";
  return process.env[key] ?? null;
}

export function webhookSecretFor(mode: ModoPago): string | null {
  const key = mode === "produccion" ? "MP_WEBHOOK_SECRET_PROD" : "MP_WEBHOOK_SECRET_TEST";
  return process.env[key] ?? null;
}

function config(mode: ModoPago) {
  return new MercadoPagoConfig({ accessToken: accessTokenFor(mode), options: { timeout: 8000 } });
}

export function orderClient(mode: ModoPago) {
  return new Order(config(mode));
}

export function paymentClient(mode: ModoPago) {
  return new Payment(config(mode));
}

export function preferenceClient(mode: ModoPago) {
  return new Preference(config(mode));
}
