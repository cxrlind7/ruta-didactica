import { MercadoPagoConfig, Order, Payment, Preference } from "mercadopago";

function config() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Falta MP_ACCESS_TOKEN");
  return new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
}

export function orderClient() {
  return new Order(config());
}

export function paymentClient() {
  return new Payment(config());
}

export function preferenceClient() {
  return new Preference(config());
}
