import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { createMpPreference } from "@/lib/mercadoPagoPreference";

// Checkout en modo "producción" por enlace: no tokeniza tarjeta -- registra
// el pedido (pending) con el código de la matriz de 16 productos (precio,
// cobertura y ruta) y genera un link de pago real de Mercado Pago (Checkout
// Pro) específico para ese pedido, vía la API. A diferencia de un enlace
// fijo compartido por todos los compradores, esta preferencia lleva
// external_reference = nuestro orderId, así el webhook puede confirmar el
// pago automáticamente (ver /api/webhooks/mercadopago) sin depender de que
// el admin lo confirme a mano -- aunque esa confirmación manual (ver
// /api/admin/pedidos) se deja como respaldo si el webhook fallara.
const RUTA_LABEL: Record<string, string> = { BASE: "Base", VISUAL: "Visual", SEGUIMIENTO: "Seguimiento", INTEGRAL: "Integral" };
const COBERTURA_LABEL: Record<string, string> = { quincena: "Quincena", mes: "Mes", trimestre: "Trimestre", ciclo: "Ciclo completo" };

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

// req.nextUrl.origin refleja la dirección interna del contenedor detrás del
// proxy de Railway (ej. http://localhost:8080), no el dominio público -- eso
// mandaba a Mercado Pago un back_urls.success inalcanzable y dejaba al
// comprador varado tras pagar, aunque el pago sí se aprobara. Los headers
// x-forwarded-* sí traen el host/proto públicos reales.
function publicOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : req.nextUrl.origin;
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

  const title = `Ruta ${RUTA_LABEL[rutaCodigo] ?? rutaCodigo} · Grado ${grado} · ${
    COBERTURA_LABEL[cobertura] ?? cobertura
  } (${periodoComprado})`;
  const origin = publicOrigin(req);

  // Misma protección de doble cobro que /api/checkout: si ya hay un pedido
  // pendiente igual, se reutiliza (generando una preferencia nueva, ya que
  // las anteriores pueden haber expirado) en vez de crear otro pedido.
  const existingPending = await prisma.order.findFirst({
    where: {
      userId: user.id,
      status: "pending",
      items: { some: { grado, ruta: rutaCodigo, cobertura, periodoComprado } },
    },
  });
  if (existingPending) {
    const pref = await createMpPreference({
      mode: "produccion",
      orderId: existingPending.id,
      title,
      totalMXN: producto.precioMXN,
      payerEmail,
      payerName,
      origin,
    });
    if (!pref.ok) return NextResponse.json({ error: pref.error }, { status: 502 });
    return NextResponse.json({ orderId: existingPending.id, paymentUrl: pref.initPoint });
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

  const pref = await createMpPreference({
    mode: "produccion",
    orderId: order.id,
    title,
    totalMXN: producto.precioMXN,
    payerEmail,
    payerName,
    origin,
  });
  if (!pref.ok) {
    return NextResponse.json({ error: pref.error, orderId: order.id }, { status: 502 });
  }

  return NextResponse.json({ orderId: order.id, paymentUrl: pref.initPoint });
}
