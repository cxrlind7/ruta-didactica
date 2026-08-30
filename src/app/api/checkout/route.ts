import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { createMpOrder } from "@/lib/mercadoPagoOrder";
import { RouteKey } from "@/lib/data";

type CheckoutBody = {
  grado?: unknown;
  ruta?: unknown; // BASE | VISUAL | SEGUIMIENTO | INTEGRAL
  cobertura?: unknown; // quincena | mes | trimestre | ciclo
  periodoComprado?: unknown; // T1_Q01 | T1_M01 | T1 | CICLO segun cobertura
  payerEmail?: unknown;
  payerName?: unknown;
  formData?: {
    token?: unknown;
    payment_method_id?: unknown;
    issuer_id?: unknown;
    installments?: unknown;
    payment_type?: unknown;
  };
};

const RUTA_A_KEY: Record<string, RouteKey> = {
  BASE: "base",
  VISUAL: "visual",
  SEGUIMIENTO: "seguimiento",
  INTEGRAL: "integral",
};

const COBERTURAS = ["quincena", "mes", "trimestre", "ciclo"] as const;
type Cobertura = (typeof COBERTURAS)[number];

function coberturaColumn(cobertura: Cobertura) {
  if (cobertura === "quincena") return "compraQuincena" as const;
  if (cobertura === "mes") return "compraMes" as const;
  if (cobertura === "trimestre") return "compraTrimestre" as const;
  return "compraCiclo" as const;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as CheckoutBody | null;
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const grado = Number(body.grado);
  const rutaCodigo = typeof body.ruta === "string" ? body.ruta.toUpperCase() : "";
  const cobertura = typeof body.cobertura === "string" ? (body.cobertura as Cobertura) : undefined;
  const periodoComprado = typeof body.periodoComprado === "string" ? body.periodoComprado : "";
  const payerEmail = typeof body.payerEmail === "string" ? body.payerEmail.trim().toLowerCase() : "";
  const payerName = typeof body.payerName === "string" ? body.payerName.trim() : "";
  const token = typeof body.formData?.token === "string" ? body.formData.token : "";
  const paymentMethodId = typeof body.formData?.payment_method_id === "string" ? body.formData.payment_method_id : "";
  const installments = Number(body.formData?.installments) || 1;
  const issuerId = typeof body.formData?.issuer_id === "string" ? body.formData.issuer_id : undefined;
  const paymentType = typeof body.formData?.payment_type === "string" ? body.formData.payment_type : "credit_card";

  if (!Number.isInteger(grado) || grado < 1 || grado > 6) {
    return NextResponse.json({ error: "Grado inválido" }, { status: 400 });
  }
  const rutaKey = RUTA_A_KEY[rutaCodigo];
  if (!rutaKey) {
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
  if (!token || !paymentMethodId) {
    return NextResponse.json({ error: "Faltan datos del pago" }, { status: 400 });
  }

  // El periodoComprado debe existir de verdad en la matriz para ese grado+ruta
  // (evita cobrar un codigo inventado que despues no desbloquea nada).
  const columna = coberturaColumn(cobertura);
  const publicacionRef = await prisma.publicacion.findFirst({
    where: { grado, ruta: rutaCodigo, [columna]: periodoComprado },
  });
  if (!publicacionRef) {
    return NextResponse.json({ error: "Ese periodo no existe para ese grado y ruta" }, { status: 400 });
  }

  const producto = await prisma.paymentProduct.findFirst({ where: { cobertura, ruta: rutaCodigo, active: true } });
  if (!producto) {
    return NextResponse.json({ error: "Ese producto no está disponible por ahora" }, { status: 400 });
  }
  const priceMXN = producto.precioMXN;

  const [firstName, ...rest] = payerName ? payerName.split(" ") : [payerEmail.split("@")[0]];
  const lastName = rest.join(" ") || "Comprador";

  const user = await prisma.user.upsert({
    where: { email: payerEmail },
    update: payerName ? { name: payerName } : {},
    create: { email: payerEmail, name: payerName || undefined },
  });
  await setSession({ userId: user.id, email: user.email });

  // Protección de doble cobro: si ya hay un pedido pendiente para exactamente
  // el mismo grado+ruta+cobertura+periodo, no se crea uno nuevo.
  const existingPending = await prisma.order.findFirst({
    where: {
      userId: user.id,
      status: "pending",
      items: { some: { grado, ruta: rutaCodigo, cobertura, periodoComprado } },
    },
  });
  if (existingPending) {
    return NextResponse.json(
      { error: "Ya tienes un pago en proceso para esta compra", orderId: existingPending.id },
      { status: 409 }
    );
  }

  const rutaLabel = { base: "Base", visual: "Visual", seguimiento: "Seguimiento", integral: "Integral" }[rutaKey];
  const description = `Grado ${grado} · Ruta ${rutaLabel} · ${cobertura} ${periodoComprado}`;

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      totalMXN: priceMXN,
      items: {
        create: [
          {
            itemId: `${grado}-${rutaCodigo}-${cobertura}-${periodoComprado}`,
            priceMXN,
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

  // Las tarjetas oficiales de prueba de Mercado Pago solo funcionan con
  // credenciales de producción (APP_USR-) sin activar -- probado en esta
  // sesión: con credenciales TEST- reales, el SDK las rechaza de plano
  // ("Test credentials are not supported..."). Por eso el checkout con
  // tarjeta usa producción tanto en modo de pruebas del sitio como en
  // producción real; las credenciales TEST- quedan sin usar hasta que se
  // implemente un flujo con test users de Mercado Pago.
  const result = await createMpOrder({
    mode: "produccion",
    orderId: order.id,
    totalMXN: priceMXN,
    description,
    payerEmail,
    firstName,
    lastName,
    items: [{ title: description, unitPriceMXN: priceMXN, externalCode: order.id }],
    token,
    paymentMethodId,
    paymentType,
    installments,
    issuerId,
  });

  if (!result.ok) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "rejected", ...(result.mpOrderId ? { mpOrderId: result.mpOrderId } : {}) },
    });
    return NextResponse.json({ error: result.error, orderId: order.id }, { status: 502 });
  }

  await prisma.order.update({ where: { id: order.id }, data: { mpOrderId: result.mpOrderId } });
  return NextResponse.json({ orderId: order.id, mpStatus: result.status });
}
