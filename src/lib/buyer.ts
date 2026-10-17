import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addGuestOrder, getSessionUser } from "@/lib/session";

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
// pendientes vive en cada ruta): si esta cuenta ya tiene exactamente este
// grado+ruta+cobertura+periodo, no se vuelve a cobrar. Se revisa el
// Entitlement porque es lo que deja approveOrder() al aprobar el pago.
export async function alreadyPurchasedResponse(userId: string, itemId: string): Promise<NextResponse | null> {
  const owned = await prisma.entitlement.findUnique({ where: { userId_itemId: { userId, itemId } } });
  if (!owned) return null;
  return NextResponse.json(
    { error: "Este correo ya tiene esta compra. Inicia sesión para verla en tu biblioteca.", alreadyOwned: true },
    { status: 409 }
  );
}
