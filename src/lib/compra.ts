import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { entitlementIncludes } from "@/lib/motorReglas";

// Qué se está comprando, ya validado contra la base -- compartido entre
// /api/checkout (tarjeta) y /api/checkout/link (link de pago), que antes
// repetían esta validación cada uno. Hay dos tipos de compra:
// - ruta: grado + ruta + cobertura + periodo, con precio de PaymentProduct;
// - clase suelta: claseId, con precio de la propia Clase.
export type CompraResuelta = {
  itemId: string;
  priceMXN: number;
  titulo: string;
  orderItem: Omit<Prisma.OrderItemCreateWithoutOrderInput, "itemId" | "priceMXN">;
  // Para la protección de doble cobro con pedidos pendientes.
  mismoItem: Prisma.OrderItemWhereInput;
  // Respuesta 409 si la cuenta ya tiene esto (o algo que lo incluye).
  yaIncluidaResponse: (userId: string) => Promise<NextResponse | null>;
};

const RUTAS = ["BASE", "VISUAL", "SEGUIMIENTO", "INTEGRAL"];
const RUTA_LABEL: Record<string, string> = { BASE: "Base", VISUAL: "Visual", SEGUIMIENTO: "Seguimiento", INTEGRAL: "Integral" };
const COBERTURAS = ["quincena", "mes", "trimestre", "ciclo"] as const;
type Cobertura = (typeof COBERTURAS)[number];
const COBERTURA_LABEL: Record<Cobertura, string> = { quincena: "Quincena", mes: "Mes", trimestre: "Trimestre", ciclo: "Ciclo completo" };

function coberturaColumn(cobertura: Cobertura) {
  if (cobertura === "quincena") return "compraQuincena" as const;
  if (cobertura === "mes") return "compraMes" as const;
  if (cobertura === "trimestre") return "compraTrimestre" as const;
  return "compraCiclo" as const;
}

function error(message: string) {
  return { ok: false as const, response: NextResponse.json({ error: message }, { status: 400 }) };
}

function yaIncluida(esLaMisma: boolean) {
  return NextResponse.json(
    {
      error: esLaMisma
        ? "Este correo ya tiene esta compra. Inicia sesión para verla en tu biblioteca."
        : "Este correo ya tiene una compra que incluye este material. Inicia sesión para verlo en tu biblioteca.",
      alreadyOwned: true,
    },
    { status: 409 }
  );
}

export async function resolverCompra(
  body: Record<string, unknown>
): Promise<{ ok: true; compra: CompraResuelta } | { ok: false; response: NextResponse }> {
  if (typeof body.claseId === "string" && body.claseId) return resolverClase(body.claseId);
  return resolverRuta(body);
}

async function resolverClase(claseId: string) {
  const clase = await prisma.clase.findUnique({ where: { id: claseId }, include: { archivoDrive: true } });
  if (!clase || !clase.activa || !clase.archivoDrive.ingestedAt) return error("Esa clase no está disponible por ahora");

  const itemId = `clase-${clase.id}`;
  const compra: CompraResuelta = {
    itemId,
    priceMXN: clase.precioMXN,
    titulo: `Clase · ${clase.titulo}`,
    orderItem: { claseId: clase.id },
    mismoItem: { claseId: clase.id },
    yaIncluidaResponse: async (userId) => {
      const owned = await prisma.entitlement.findUnique({ where: { userId_itemId: { userId, itemId } } });
      return owned ? yaIncluida(true) : null;
    },
  };
  return { ok: true as const, compra };
}

async function resolverRuta(body: Record<string, unknown>) {
  const grado = Number(body.grado);
  const ruta = typeof body.ruta === "string" ? body.ruta.toUpperCase() : "";
  const cobertura = typeof body.cobertura === "string" ? (body.cobertura as Cobertura) : undefined;
  const periodoComprado = typeof body.periodoComprado === "string" ? body.periodoComprado : "";

  if (!Number.isInteger(grado) || grado < 1 || grado > 6) return error("Grado inválido");
  if (!RUTAS.includes(ruta)) return error("Ruta inválida");
  if (!cobertura || !COBERTURAS.includes(cobertura)) return error("Cobertura inválida");
  if (!periodoComprado) return error("Falta el periodo a comprar");

  // El periodoComprado debe existir de verdad en la matriz para ese grado+ruta
  // (evita cobrar un codigo inventado que despues no desbloquea nada).
  const publicacionRef = await prisma.publicacion.findFirst({
    where: { grado, ruta, [coberturaColumn(cobertura)]: periodoComprado },
  });
  if (!publicacionRef) return error("Ese periodo no existe para ese grado y ruta");

  const producto = await prisma.paymentProduct.findFirst({ where: { cobertura, ruta, active: true } });
  if (!producto) return error("Ese producto no está disponible por ahora");

  const datos = { grado, ruta, cobertura, periodoComprado };
  const compra: CompraResuelta = {
    itemId: `${grado}-${ruta}-${cobertura}-${periodoComprado}`,
    priceMXN: producto.precioMXN,
    titulo: `Ruta ${RUTA_LABEL[ruta]} · Grado ${grado} · ${COBERTURA_LABEL[cobertura]} (${periodoComprado})`,
    orderItem: { ...datos, paymentCode: producto.codigo },
    mismoItem: datos,
    // Protección de doble cobro para compras ya aprobadas: si esta cuenta ya
    // tiene una compra que incluye por completo la nueva -- la misma, o una
    // más grande como el ciclo o Integral (ver entitlementIncludes) --, no
    // se vuelve a cobrar.
    yaIncluidaResponse: async (userId) => {
      const entitlements = await prisma.entitlement.findMany({ where: { userId, grado } });
      const incluida = entitlements.find((ent) => entitlementIncludes(ent, datos, publicacionRef));
      if (!incluida) return null;
      return yaIncluida(
        incluida.ruta === ruta && incluida.cobertura === cobertura && incluida.periodoComprado === periodoComprado
      );
    },
  };
  return { ok: true as const, compra };
}
