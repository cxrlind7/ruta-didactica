import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionUser = await getSessionUser();

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || !sessionUser || order.userId !== sessionUser.userId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ status: order.status });
}
