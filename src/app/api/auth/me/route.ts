import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ account: null });

  const user = await prisma.user.findUnique({ where: { id: sessionUser.userId } });
  if (!user) return NextResponse.json({ account: null });

  return NextResponse.json({
    account: { email: user.email, name: user.name, hasPassword: !!user.passwordHash, role: user.role },
  });
}
