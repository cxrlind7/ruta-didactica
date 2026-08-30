import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Version publica de /api/admin/payment-products: solo lo que el selector
// de compra necesita (código, cobertura, ruta, precio) de los productos
// activos, sin requerir sesión de admin.
export async function GET() {
  const productos = await prisma.paymentProduct.findMany({
    where: { active: true },
    select: { codigo: true, cobertura: true, ruta: true, precioMXN: true },
  });
  return NextResponse.json({ productos });
}
