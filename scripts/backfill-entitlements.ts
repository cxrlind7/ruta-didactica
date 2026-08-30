/**
 * Rellena grado/ruta/cobertura/periodoComprado en Entitlement para filas
 * creadas antes de que el webhook empezara a copiarlos desde OrderItem.
 * Idempotente: solo toca filas con esos campos en null.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const entitlements = await prisma.entitlement.findMany({ where: { grado: null } });
  let updated = 0;
  for (const ent of entitlements) {
    const orderItem = await prisma.orderItem.findFirst({ where: { orderId: ent.orderId, itemId: ent.itemId } });
    if (!orderItem?.grado) continue;
    await prisma.entitlement.update({
      where: { id: ent.id },
      data: {
        grado: orderItem.grado,
        ruta: orderItem.ruta,
        cobertura: orderItem.cobertura,
        periodoComprado: orderItem.periodoComprado,
      },
    });
    updated++;
  }
  console.log(`Revisados: ${entitlements.length}. Actualizados: ${updated}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
