import { NextResponse } from "next/server";
import type { Publicacion, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addGuestOrder, getSessionUser } from "@/lib/session";
import { entitlementIncludes, type Compra } from "@/lib/motorReglas";

// Compartido entre las rutas que crean pedidos (/api/checkout,
// /api/checkout/link, /api/orders). Antes cada una hacía upsert del correo y
// abría una sesión completa para quien fuera -- sin contraseña, así que
// cualquiera podía escribir el correo de otra persona y entrar a su
// biblioteca. Ahora:
// - si la cuenta ya tiene contraseña, hay que haber iniciado sesión con ella;
// - si no la tiene (o es nueva), se compra como invitado: el pedido queda a
//   nombre de esa cuenta, pero no se abre sesión (ver addGuestOrder).
export async function resolveBuyer(
  payerEmail: string,
  payerName: string
): Promise<{ ok: true; user: User; isGuest: boolean } | { ok: false; response: NextResponse }> {
  const sessionUser = await getSessionUser();
  const existing = await prisma.user.findUnique({ where: { email: payerEmail } });
  const isOwnSession = !!existing && sessionUser?.userId === existing.id;

  if (existing?.passwordHash && !isOwnSession) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Ya existe una cuenta con este correo. Inicia sesión para comprar con ella.", needsLogin: true },
        { status: 401 }
      ),
    };
  }

  const user = existing
    ? payerName && isOwnSession
      ? await prisma.user.update({ where: { id: existing.id }, data: { name: payerName } })
      : existing
    : await prisma.user.create({ data: { email: payerEmail, name: payerName || undefined } });

  return { ok: true, user, isGuest: !isOwnSession };
}

// Se llama una vez creado el pedido: a un invitado le da permiso de ver ese
// pedido y, cuando se apruebe, de crear su contraseña.
export async function grantBuyerAccess(buyer: { user: User; isGuest: boolean }, orderId: string) {
  if (buyer.isGuest) await addGuestOrder({ userId: buyer.user.id, email: buyer.user.email }, orderId);
}

// Protección de doble cobro para compras ya aprobadas (la de pedidos
// pendientes vive en cada ruta): si esta cuenta ya tiene una compra que
// incluye por completo la nueva -- la misma, o una más grande como el ciclo
// o Integral (ver entitlementIncludes) --, no se vuelve a cobrar.
export async function alreadyCoveredResponse(
  userId: string,
  compra: Compra,
  ref: Pick<Publicacion, "trimestre" | "mesComercial">
): Promise<NextResponse | null> {
  const entitlements = await prisma.entitlement.findMany({ where: { userId, grado: compra.grado } });
  const incluida = entitlements.find((ent) => entitlementIncludes(ent, compra, ref));
  if (!incluida) return null;
  const esLaMisma = incluida.ruta === compra.ruta && incluida.cobertura === compra.cobertura &&
    incluida.periodoComprado === compra.periodoComprado;
  return NextResponse.json(
    {
      error: esLaMisma
        ? "Este correo ya tiene esta compra. Inicia sesión para verla en tu biblioteca."
        : "Este correo ya tiene una compra que incluye este material. Inicia sesión para verlo en tu biblioteca.",
      alreadyOwned: true,
    },
    { status: 409 }
  );
}
