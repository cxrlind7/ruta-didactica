import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
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

  const passwordHash = await hashPassword(password);
  // Si el correo ya existe (p. ej. porque compró antes del registro), esto
  // reclama esa cuenta poniéndole contraseña por primera vez; si no existe,
  // la crea desde cero.
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, ...(name ? { name } : {}) },
    create: { email, name, passwordHash },
  });

  await setSession({ userId: user.id, email: user.email });

  return NextResponse.json({ email: user.email, name: user.name });
}
