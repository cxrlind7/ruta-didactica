import { MercadoPagoConfig, Order, Payment, Preference } from "mercadopago";
import type { ModoPago } from "@/lib/modoPago";

// Credenciales de prueba (TEST-...) y de producción (APP_USR-...) son de
// aplicaciones/entornos separados en Mercado Pago -- un recurso creado con
// una no se puede consultar ni cobrar con la otra. Qué credencial usar en
// cada momento depende del modo de cobro global (ver modoPago.ts), no de un
// único token fijo como antes.
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
