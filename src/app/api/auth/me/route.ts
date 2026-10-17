import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGuest, getSessionUser } from "@/lib/session";

export async function GET() {
  const sessionUser = await getSessionUser();
  const user = sessionUser ? await prisma.user.findUnique({ where: { id: sessionUser.userId } }) : null;

  // Si se compró como invitado (ver buyer.ts), /confirmacion necesita saber
  // con qué correo para ofrecer crear la contraseña -- aunque no haya sesión.
  const guestPayload = await getGuest();
  const guestUser =
    guestPayload && guestPayload.userId !== user?.id
      ? await prisma.user.findUnique({ where: { id: guestPayload.userId } })
      : null;

  return NextResponse.json({
    account: user ? { email: user.email, name: user.name, hasPassword: !!user.passwordHash, role: user.role } : null,
    guest: guestUser ? { email: guestUser.email, hasPassword: !!guestUser.passwordHash } : null,
  });
}
