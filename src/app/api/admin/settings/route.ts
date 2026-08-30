import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";

const MODOS = ["prueba", "produccion"];

export async function GET() {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const settings = await prisma.appSettings.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });
  return NextResponse.json({ modoPago: settings.modoPago });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const modoPago = typeof body?.modoPago === "string" ? body.modoPago : "";
  if (!MODOS.includes(modoPago)) {
    return NextResponse.json({ error: "modoPago inválido" }, { status: 400 });
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { modoPago },
    create: { id: "global", modoPago },
  });
  return NextResponse.json({ modoPago: settings.modoPago });
}
