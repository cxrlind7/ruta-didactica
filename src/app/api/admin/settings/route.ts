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
  return NextResponse.json({ modoPago: settings.modoPago, permitirTarjetaProduccion: settings.permitirTarjetaProduccion });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const data: { modoPago?: string; permitirTarjetaProduccion?: boolean } = {};

  if (body?.modoPago !== undefined) {
    if (!MODOS.includes(body.modoPago)) {
      return NextResponse.json({ error: "modoPago inválido" }, { status: 400 });
    }
    data.modoPago = body.modoPago;
  }
  if (body?.permitirTarjetaProduccion !== undefined) {
    if (typeof body.permitirTarjetaProduccion !== "boolean") {
      return NextResponse.json({ error: "permitirTarjetaProduccion inválido" }, { status: 400 });
    }
    data.permitirTarjetaProduccion = body.permitirTarjetaProduccion;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: "global" },
    update: data,
    create: { id: "global", ...data },
  });
  return NextResponse.json({ modoPago: settings.modoPago, permitirTarjetaProduccion: settings.permitirTarjetaProduccion });
}
