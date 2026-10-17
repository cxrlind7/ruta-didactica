import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "rd_session";
const GUEST_COOKIE_NAME = "rd_guest";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MAX_GUEST_ORDERS = 20;

type SessionPayload = {
  userId: string;
  email: string;
};

// Comprar como invitado (sin contraseña) ya no abre una sesión completa --
// cualquiera podía escribir el correo de otra persona en el checkout y
// entrar a su biblioteca. En su lugar se guarda este permiso limitado: solo
// deja ver el estado de esos pedidos y ponerle contraseña a la cuenta una
// vez que alguno quedó aprobado (ver /api/auth/register).
export type GuestPayload = {
  userId: string;
  email: string;
  orderIds: string[];
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("Falta SESSION_SECRET");
  return value;
}

// La cookie de invitado se firma con un prefijo distinto: si no, su token
// (que también trae userId) se podría pegar tal cual en rd_session y pasar
// por una sesión completa. La sesión se queda sin prefijo para no invalidar
// las cookies que ya existen.
type TokenKind = "session" | "guest";

function sign(kind: TokenKind, payload: string) {
  const input = kind === "guest" ? `guest.${payload}` : payload;
  return createHmac("sha256", secret()).update(input).digest("hex");
}

function encode(kind: TokenKind, data: SessionPayload | GuestPayload) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = sign(kind, payload);
  return `${payload}.${signature}`;
}

function decode<T>(kind: TokenKind, token: string): T | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(kind, payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
} as const;

export async function setSession(user: SessionPayload) {
  const store = await cookies();
  store.set(COOKIE_NAME, encode("session", user), COOKIE_OPTIONS);
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decode<SessionPayload>("session", token);
}

export async function getGuest(): Promise<GuestPayload | null> {
  const store = await cookies();
  const token = store.get(GUEST_COOKIE_NAME)?.value;
  if (!token) return null;
  const guest = decode<GuestPayload>("guest", token);
  return guest && Array.isArray(guest.orderIds) ? guest : null;
}

// Si el permiso de invitado ya era de esta misma cuenta, se le agrega el
// pedido; si era de otra (otro correo en el mismo navegador), se reemplaza.
export async function addGuestOrder(user: { userId: string; email: string }, orderId: string) {
  const current = await getGuest();
  const previous = current?.userId === user.userId ? current.orderIds.filter((id) => id !== orderId) : [];
  const guest: GuestPayload = { ...user, orderIds: [...previous, orderId].slice(-MAX_GUEST_ORDERS) };
  const store = await cookies();
  store.set(GUEST_COOKIE_NAME, encode("guest", guest), COOKIE_OPTIONS);
}

export async function clearGuest() {
  const store = await cookies();
  store.delete(GUEST_COOKIE_NAME);
}
