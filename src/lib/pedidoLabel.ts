import type { OrderItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { gradeLabel, routes, type RouteKey } from "@/lib/data";
import { periodoLabelFor, type Cobertura } from "@/lib/periodos";

const RUTA_A_KEY: Record<string, RouteKey> = { BASE: "base", VISUAL: "visual", SEGUIMIENTO: "seguimiento", INTEGRAL: "integral" };

// Texto para mostrar un artículo de un pedido (confirmación, panel admin):
// "Ruta Base · Primer grado · Trimestre 1 · Quincena 1" o "Clase · <título>".
// Los pedidos viejos de la demo inicial no traen ninguno de los dos datos.
export async function etiquetasDeItems(items: OrderItem[]): Promise<Map<string, string>> {
  const claseIds = items.map((i) => i.claseId).filter((id): id is string => !!id);
  const clases = claseIds.length
    ? await prisma.clase.findMany({ where: { id: { in: claseIds } }, select: { id: true, titulo: true } })
    : [];
  const tituloClase = new Map(clases.map((c) => [c.id, c.titulo]));

  const etiquetas = new Map<string, string>();
  for (const item of items) {
    if (item.claseId) {
      etiquetas.set(item.id, `Clase · ${tituloClase.get(item.claseId) ?? "(clase eliminada)"}`);
    } else if (item.grado !== null && item.ruta && item.cobertura && item.periodoComprado) {
      const ruta = routes[RUTA_A_KEY[item.ruta]]?.label ?? item.ruta;
      const periodo = periodoLabelFor(item.cobertura as Cobertura, item.periodoComprado);
      etiquetas.set(item.id, `${ruta} · ${gradeLabel(item.grado)} · ${periodo}`);
    } else {
      etiquetas.set(item.id, item.itemId);
    }
  }
  return etiquetas;
}
