import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicKeyFor } from "@/lib/mercadopago";

// Version publica de /api/admin/settings: el sitio de compra necesita saber
// si esta en modo de pruebas (checkout dinamico con tarjeta) o produccion
// (link de pago por pedido y, si se activa, tarjeta) sin requerir sesion de
// admin. mpPublicKey va aquí (no como NEXT_PUBLIC_*) porque cuál de las dos
// aplicaciones de Mercado Pago usar (ver mercadopago.ts) depende del modo
// guardado en la base de datos, algo que un env var fijo en build time no
// puede reflejar.
export async function GET() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  const modoPago = settings?.modoPago === "produccion" ? "produccion" : "prueba";
  return NextResponse.json({
    modoPago,
    permitirTarjetaProduccion: settings?.permitirTarjetaProduccion ?? false,
    mpPublicKey: publicKeyFor(modoPago),
  });
}
