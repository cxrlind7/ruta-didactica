import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";

// Checkout en modo "producción": no tokeniza tarjeta ni llama a la API de
// Mercado Pago -- solo registra el pedido (pending) con el código de la
// matriz de 16 enlaces fijos y devuelve la URL a la que el sitio debe
// redirigir. La confirmación de pago es manual desde el panel admin (ver
// /api/admin/pedidos), tal como pide la Especificación de Enlaces de Pago
// v1.0 en su "Fase simple".
type LinkCheckoutBody = {
  grado?: unknown;
  ruta?: unknown; // BASE | VISUAL | SEGUIMIENTO | INTEGRAL
  cobertura?: unknown; // quincena | mes | trimestre | ciclo
  periodoComprado?: unknown;
  payerEmail?: unknown;
  payerName?: unknown;
};

const RUTAS = ["BASE", "VISUAL", "SEGUIMIENTO", "INTEGRAL"];
const COBERTURAS = ["quincena", "mes", "trimestre", "ciclo"] as const;
type Cobertura = (typeof COBERTURAS)[number];

function coberturaColumn(cobertura: Cobertura) {
  if (cobertura === "quincena") return "compraQuincena" as const;
  if (cobertura === "mes") return "compraMes" as const;
  if (cobertura === "trimestre") return "compraTrimestre" as const;
  return "compraCiclo" as const;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as LinkCheckoutBody | null;
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const grado = Number(body.grado);
  const rutaCodigo = typeof body.ruta === "string" ? body.ruta.toUpperCase() : "";
  const cobertura = typeof body.cobertura === "string" ? (body.cobertura as Cobertura) : undefined;
  const periodoComprado = typeof body.periodoComprado === "string" ? body.periodoComprado : "";
  const payerEmail = typeof body.payerEmail === "string" ? body.payerEmail.trim().toLowerCase() : "";
  const payerName = typeof body.payerName === "string" ? body.payerName.trim() : "";

  if (!Number.isInteger(grado) || grado < 1 || grado > 6) {
    return NextResponse.json({ error: "Grado inválido" }, { status: 400 });
  }
  if (!RUTAS.includes(rutaCodigo)) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }
  if (!cobertura || !COBERTURAS.includes(cobertura)) {
    return NextResponse.json({ error: "Cobertura inválida" }, { status: 400 });
  }
  if (!periodoComprado) {
    return NextResponse.json({ error: "Falta el periodo a comprar" }, { status: 400 });
  }
  if (!payerEmail || !payerEmail.includes("@")) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  // El periodoComprado debe existir de verdad en la matriz para ese grado+ruta.
  const columna = coberturaColumn(cobertura);
  const publicacionRef = await prisma.publicacion.findFirst({
    where: { grado, ruta: rutaCodigo, [columna]: periodoComprado },
  });
  if (!publicacionRef) {
    return NextResponse.json({ error: "Ese periodo no existe para ese grado y ruta" }, { status: 400 });
  }

  const producto = await prisma.paymentProduct.findFirst({
    where: { cobertura, ruta: rutaCodigo, active: true },
  });
  if (!producto) {
    return NextResponse.json({ error: "Ese producto no está disponible por ahora" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { email: payerEmail },
    update: payerName ? { name: payerName } : {},
    create: { email: payerEmail, name: payerName || undefined },
  });
  await setSession({ userId: user.id, email: user.email });

  // Misma protección de doble cobro que /api/checkout.
  const existingPending = await prisma.order.findFirst({
    where: {
      userId: user.id,
      status: "pending",
      items: { some: { grado, ruta: rutaCodigo, cobertura, periodoComprado } },
    },
  });
  if (existingPending) {
    const existingItem = await prisma.orderItem.findFirst({ where: { orderId: existingPending.id } });
    return NextResponse.json({
      orderId: existingPending.id,
      paymentUrl: existingItem?.paymentCode
        ? (await prisma.paymentProduct.findUnique({ where: { codigo: existingItem.paymentCode } }))?.url
        : producto.url,
    });
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      totalMXN: producto.precioMXN,
      items: {
        create: [
          {
            itemId: `${grado}-${rutaCodigo}-${cobertura}-${periodoComprado}`,
            priceMXN: producto.precioMXN,
            grado,
            ruta: rutaCodigo,
            cobertura,
            periodoComprado,
            paymentCode: producto.codigo,
          },
        ],
      },
    },
  });

  return NextResponse.json({ orderId: order.id, paymentUrl: producto.url });
}
