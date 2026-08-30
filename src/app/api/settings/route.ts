import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Version publica de /api/admin/settings: el sitio de compra necesita saber
// si esta en modo de pruebas (checkout dinamico con tarjeta) o produccion
// (redirige a los 16 enlaces fijos) sin requerir sesion de admin.
export async function GET() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  return NextResponse.json({ modoPago: settings?.modoPago ?? "prueba" });
}
