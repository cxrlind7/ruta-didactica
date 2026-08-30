/**
 * Siembra los 16 enlaces fijos de Mercado Pago (Especificación de Enlaces de
 * Pago e Integración Web v1.0, 23-ago-2026). Se puede correr varias veces:
 * hace upsert por código, sin tocar precio/url/active si ya fueron editados
 * a mano desde el panel admin -- salvo que se pase --force.
 * Uso: npx tsx scripts/seed-payment-products.ts [--force]
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const PRODUCTOS = [
  { codigo: "QB", cobertura: "quincena", ruta: "BASE", precioMXN: 99, url: "https://mpago.la/32WwVXd" },
  { codigo: "QV", cobertura: "quincena", ruta: "VISUAL", precioMXN: 139, url: "https://mpago.la/2sfjxPn" },
  { codigo: "QS", cobertura: "quincena", ruta: "SEGUIMIENTO", precioMXN: 169, url: "https://mpago.la/1tRrzfg" },
  { codigo: "QI", cobertura: "quincena", ruta: "INTEGRAL", precioMXN: 199, url: "https://mpago.la/1Q4eStf" },
  { codigo: "MB", cobertura: "mes", ruta: "BASE", precioMXN: 179, url: "https://mpago.la/1gZmuwn" },
  { codigo: "MV", cobertura: "mes", ruta: "VISUAL", precioMXN: 249, url: "https://mpago.la/2YQR48e" },
  { codigo: "MS", cobertura: "mes", ruta: "SEGUIMIENTO", precioMXN: 299, url: "https://mpago.la/2FwfMp2" },
  { codigo: "MI", cobertura: "mes", ruta: "INTEGRAL", precioMXN: 349, url: "https://mpago.la/1ufFAd4" },
  { codigo: "TB", cobertura: "trimestre", ruta: "BASE", precioMXN: 449, url: "https://mpago.la/1aLa4FX" },
  { codigo: "TV", cobertura: "trimestre", ruta: "VISUAL", precioMXN: 629, url: "https://mpago.la/1bGQ8RP" },
  { codigo: "TS", cobertura: "trimestre", ruta: "SEGUIMIENTO", precioMXN: 749, url: "https://mpago.la/1tHKGb7" },
  { codigo: "TI", cobertura: "trimestre", ruta: "INTEGRAL", precioMXN: 899, url: "https://mpago.la/1ARhpqj" },
  { codigo: "CB", cobertura: "ciclo", ruta: "BASE", precioMXN: 1190, url: "https://mpago.la/2GWJREC" },
  { codigo: "CV", cobertura: "ciclo", ruta: "VISUAL", precioMXN: 1590, url: "https://mpago.la/1XcGHzd" },
  { codigo: "CS", cobertura: "ciclo", ruta: "SEGUIMIENTO", precioMXN: 1890, url: "https://mpago.la/2z4J9pF" },
  { codigo: "CI", cobertura: "ciclo", ruta: "INTEGRAL", precioMXN: 2190, url: "https://mpago.la/2w187Bh" },
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
      update: { cobertura: p.cobertura, ruta: p.ruta, precioMXN: p.precioMXN, url: p.url },
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
