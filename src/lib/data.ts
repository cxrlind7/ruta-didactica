export type CoverageKey = "quincena" | "mes" | "trimestre" | "ciclo";
export type RouteKey = "base" | "visual" | "seguimiento" | "integral";

// Código de ruta (BASE/VISUAL/SEGUIMIENTO/INTEGRAL) tal como se guarda en
// OrderItem/Entitlement/PaymentProduct -- la llave real de negocio es
// cobertura + este código (matriz de 16 enlaces de pago), no el grado.
export const RUTA_CODE: Record<RouteKey, string> = {
  base: "BASE",
  visual: "VISUAL",
  seguimiento: "SEGUIMIENTO",
  integral: "INTEGRAL",
};

export const coverages: Record<
  CoverageKey,
  { label: string; icon: string; days: string }
> = {
  quincena: {
    label: "Quincena",
    icon: "/brand/coverage/quincena.png",
    days: "7 a 10 jornadas efectivas",
  },
  mes: {
    label: "Mes",
    icon: "/brand/coverage/mes.png",
    days: "Dos quincenas consecutivas",
  },
  trimestre: {
    label: "Trimestre",
    icon: "/brand/coverage/trimestre.png",
    days: "Todas las quincenas del trimestre",
  },
  ciclo: {
    label: "Ciclo completo",
    icon: "/brand/coverage/ciclo.png",
    days: "3 trimestres + cierre anual · 2026-2027",
  },
};

// Precios públicos 2026-2027 por cobertura y ruta. La quincena, el mes y el
// ciclo completo tienen un solo precio; el trimestre se desdobla porque T1
// (46 jornadas) tiene un precio distinto al de T2 y T3 (61 y 64 jornadas,
// misma escala). El cierre anual (14 jornadas, 21 jun.–9 jul.) se vende
// aparte y va incluido dentro del ciclo completo.
export type PriceTierKey = "quincena" | "mes" | "trimestre1" | "trimestre23" | "cierreAnual" | "ciclo";

export const priceTiers: Record<PriceTierKey, { label: string; detail: string }> = {
  quincena: { label: "Quincena", detail: "7 a 10 jornadas efectivas" },
  mes: { label: "Mes", detail: "Dos quincenas consecutivas" },
  trimestre1: { label: "Trimestre 1", detail: "46 jornadas" },
  trimestre23: { label: "Trimestre 2 y 3", detail: "61 y 64 jornadas · misma escala" },
  cierreAnual: { label: "Cierre anual", detail: "21 jun. a 9 jul. · 14 jornadas" },
  ciclo: { label: "Ciclo completo", detail: "T1 + T2 + T3 + cierre anual" },
};

// La compra por cobertura (carrito) usa un único precio de entrada por
// tramo; el trimestre se cotiza al precio de Trimestre 1.
export const coverageToTier: Record<CoverageKey, PriceTierKey> = {
  quincena: "quincena",
  mes: "mes",
  trimestre: "trimestre1",
  ciclo: "ciclo",
};

export const routePriceMatrix: Record<RouteKey, Record<PriceTierKey, number>> = {
  base: { quincena: 99, mes: 179, trimestre1: 339, trimestre23: 489, cierreAnual: 159, ciclo: 1190 },
  visual: { quincena: 139, mes: 249, trimestre1: 469, trimestre23: 679, cierreAnual: 219, ciclo: 1590 },
  seguimiento: { quincena: 169, mes: 299, trimestre1: 569, trimestre23: 819, cierreAnual: 269, ciclo: 1890 },
  integral: { quincena: 199, mes: 349, trimestre1: 659, trimestre23: 949, cierreAnual: 319, ciclo: 2190 },
};

export function priceForRoute(route: RouteKey, coverage: CoverageKey) {
  return routePriceMatrix[route][coverageToTier[coverage]];
}

export const routes: Record<
  RouteKey,
  {
    label: string;
    icon: string;
    tagline: string;
    subtitle: string;
    badge?: string;
    bullets: string[];
    includes: string[];
    priceMXN: number; // precio de entrada: cobertura quincena
  }
> = {
  base: {
    label: "Ruta Base",
    icon: "/brand/routes/base.png",
    tagline: "Planeación del periodo, fichas didácticas y actividades permanentes para empezar con orden.",
    subtitle: "Esencial",
    bullets: ["Planeación del periodo", "Fichas didácticas", "Actividades permanentes, recortables y evidencias"],
    includes: ["Planeación y fichas"],
    priceMXN: routePriceMatrix.base.quincena,
  },
  visual: {
    label: "Ruta Visual",
    icon: "/brand/routes/visual.png",
    tagline: "Todo lo de Ruta Base más diapositivas de apoyo visual organizadas por jornada.",
    subtitle: "Recomendada",
    badge: "Recomendada",
    bullets: ["Todo lo de Ruta Base", "Diapositivas de apoyo visual", "Acompañamiento organizado por jornada"],
    includes: ["Planeación y fichas", "Diapositivas de apoyo visual"],
    priceMXN: routePriceMatrix.visual.quincena,
  },
  seguimiento: {
    label: "Ruta Seguimiento",
    icon: "/brand/routes/seguimiento.png",
    tagline: "Todo lo de Ruta Base más seguimiento pedagógico en Excel: promedios, gráficas y fichas descriptivas.",
    subtitle: "Gestión y evidencias",
    bullets: ["Todo lo de Ruta Base", "Seguimiento pedagógico en Excel", "Promedios, gráficas y fichas descriptivas"],
    includes: ["Planeación y fichas", "Seguimiento pedagógico en Excel"],
    priceMXN: routePriceMatrix.seguimiento.quincena,
  },
  integral: {
    label: "Ruta Integral",
    icon: "/brand/routes/integral.png",
    tagline: "Planeación y fichas, apoyo visual y seguimiento pedagógico: la experiencia completa para el mismo periodo.",
    subtitle: "Mejor valor",
    badge: "Mejor valor",
    bullets: ["Ruta Base + apoyo visual", "Seguimiento pedagógico", "Experiencia completa para el mismo periodo"],
    includes: ["Planeación y fichas", "Diapositivas de apoyo visual", "Seguimiento pedagógico en Excel"],
    priceMXN: routePriceMatrix.integral.quincena,
  },
};

export const grades = [1, 2, 3, 4, 5, 6] as const;
export const gradeIcon = (g: number) => `/brand/grades/${g}.png`;
export const gradeLabel = (g: number) => {
  const map: Record<number, string> = {
    1: "Primer grado",
    2: "Segundo grado",
    3: "Tercer grado",
    4: "Cuarto grado",
    5: "Quinto grado",
    6: "Sexto grado",
  };
  return map[g];
};

export function formatMXN(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}
