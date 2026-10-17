import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearGuest, getGuest, getSessionUser, setSession } from "@/lib/session";
import { hashPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese correo. Inicia sesión en su lugar." },
      { status: 409 }
    );
  }

  // Si el correo ya existe sin contraseña (compró como invitado), ponerle
  // contraseña es reclamar esa cuenta y su biblioteca -- antes bastaba con
  // escribir el correo. Ahora solo se permite desde el navegador con el que
  // se compró (permiso de invitado, ver buyer.ts) y con un pedido ya
  // aprobado, o con una sesión vieja de esa misma cuenta.
  const guest = await getGuest();
  if (existing) {
    const sessionUser = await getSessionUser();
    const hasOwnSession = sessionUser?.userId === existing.id;
    const isGuestOfThisAccount = guest?.userId === existing.id;
    const hasApprovedGuestOrder =
      isGuestOfThisAccount &&
      (await prisma.order.count({
        where: { id: { in: guest.orderIds }, userId: existing.id, status: "approved" },
      })) > 0;

    if (!hasOwnSession && !hasApprovedGuestOrder) {
      return NextResponse.json(
        {
          error: isGuestOfThisAccount
            ? "Tu pago todavía no se confirma. Intenta de nuevo en unos minutos."
            : "Ya existe una cuenta con ese correo. Si compraste con él y no puedes crear tu contraseña, escríbenos por WhatsApp.",
        },
        { status: 409 }
      );
    }
  }

  const passwordHash = await hashPassword(password);
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, ...(name ? { name } : {}) } })
    : await prisma.user.create({ data: { email, name, passwordHash } });

  await setSession({ userId: user.id, email: user.email });
  if (guest?.userId === user.id) await clearGuest();

  return NextResponse.json({ email: user.email, name: user.name });
}
