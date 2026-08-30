import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicKeyFor } from "@/lib/mercadopago";

// Version publica de /api/admin/settings: el sitio de compra necesita saber
// si esta en modo de pruebas (checkout dinamico con tarjeta) o produccion
// (link de pago por pedido y, si se activa, tarjeta) sin requerir sesion de
// admin. mpPublicKey va aquí (no como NEXT_PUBLIC_*) porque un env var fijo
// en build time no puede depender del estado en la base de datos.
//
// La public key siempre es la de producción (APP_USR-): las tarjetas
// oficiales de prueba de Mercado Pago solo funcionan con credenciales de
// producción sin activar -- con las credenciales TEST- reales, el SDK las
// rechaza ("Test credentials are not supported..."), probado en esta sesión.
export async function GET() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  const modoPago = settings?.modoPago === "produccion" ? "produccion" : "prueba";
  return NextResponse.json({
    modoPago,
    permitirTarjetaProduccion: settings?.permitirTarjetaProduccion ?? false,
    mpPublicKey: publicKeyFor("produccion"),
  });
}
