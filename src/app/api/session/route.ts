import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSession, setSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: name ? { name } : {},
    create: { email, name },
  });

  await setSession({ userId: user.id, email: user.email });

  return NextResponse.json({ userId: user.id, email: user.email, name: user.name });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
