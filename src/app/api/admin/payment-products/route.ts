import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";

const ORDEN_COBERTURA: Record<string, number> = { quincena: 0, mes: 1, trimestre: 2, ciclo: 3 };
const ORDEN_RUTA: Record<string, number> = { BASE: 0, VISUAL: 1, SEGUIMIENTO: 2, INTEGRAL: 3 };

export async function GET() {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const productos = await prisma.paymentProduct.findMany();
  productos.sort(
    (a, b) =>
      (ORDEN_COBERTURA[a.cobertura] ?? 99) - (ORDEN_COBERTURA[b.cobertura] ?? 99) ||
      (ORDEN_RUTA[a.ruta] ?? 99) - (ORDEN_RUTA[b.ruta] ?? 99)
  );
  return NextResponse.json({ productos });
}
