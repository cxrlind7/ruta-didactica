import { prisma } from "@/lib/prisma";

export type ModoPago = "prueba" | "produccion";

// Fuente única de verdad del modo de cobro global (AppSettings.modoPago) --
// la usan tanto las rutas que crean pagos (para elegir credenciales de
// Mercado Pago) como /api/settings (para decirle al cliente qué public key
// usar).
export async function getModoPago(): Promise<ModoPago> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "global" } });
  return settings?.modoPago === "produccion" ? "produccion" : "prueba";
}
