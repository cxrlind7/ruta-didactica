/**
 * Siembra los 16 productos de pago (Especificación de Enlaces de Pago e
 * Integración Web v1.0, 23-ago-2026): código, cobertura, ruta y precio. Se
 * puede correr varias veces: hace upsert por código, sin tocar precio/active
 * si ya fueron editados a mano desde el panel admin -- salvo que se pase
 * --force.
 * Uso: npx tsx scripts/seed-payment-products.ts [--force]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const PRODUCTOS = [
  { codigo: "QB", cobertura: "quincena", ruta: "BASE", precioMXN: 99 },
  { codigo: "QV", cobertura: "quincena", ruta: "VISUAL", precioMXN: 139 },
  { codigo: "QS", cobertura: "quincena", ruta: "SEGUIMIENTO", precioMXN: 169 },
  { codigo: "QI", cobertura: "quincena", ruta: "INTEGRAL", precioMXN: 199 },
  { codigo: "MB", cobertura: "mes", ruta: "BASE", precioMXN: 179 },
  { codigo: "MV", cobertura: "mes", ruta: "VISUAL", precioMXN: 249 },
  { codigo: "MS", cobertura: "mes", ruta: "SEGUIMIENTO", precioMXN: 299 },
  { codigo: "MI", cobertura: "mes", ruta: "INTEGRAL", precioMXN: 349 },
  { codigo: "TB", cobertura: "trimestre", ruta: "BASE", precioMXN: 449 },
  { codigo: "TV", cobertura: "trimestre", ruta: "VISUAL", precioMXN: 629 },
  { codigo: "TS", cobertura: "trimestre", ruta: "SEGUIMIENTO", precioMXN: 749 },
  { codigo: "TI", cobertura: "trimestre", ruta: "INTEGRAL", precioMXN: 899 },
  { codigo: "CB", cobertura: "ciclo", ruta: "BASE", precioMXN: 1190 },
  { codigo: "CV", cobertura: "ciclo", ruta: "VISUAL", precioMXN: 1590 },
  { codigo: "CS", cobertura: "ciclo", ruta: "SEGUIMIENTO", precioMXN: 1890 },
  { codigo: "CI", cobertura: "ciclo", ruta: "INTEGRAL", precioMXN: 2190 },
];

async function main() {
  const force = process.argv.includes("--force");

  for (const p of PRODUCTOS) {
    const existing = await prisma.paymentProduct.findUnique({ where: { codigo: p.codigo } });
    if (existing && !force) {
      await prisma.paymentProduct.update({ where: { codigo: p.codigo }, data: { cobertura: p.cobertura, ruta: p.ruta } });
      continue;
    }
    await prisma.paymentProduct.upsert({
      where: { codigo: p.codigo },
      update: { cobertura: p.cobertura, ruta: p.ruta, precioMXN: p.precioMXN },
      create: { ...p, active: true },
    });
  }

  const count = await prisma.paymentProduct.count();
  console.log(`Listo: ${count} productos de pago en la tabla.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
