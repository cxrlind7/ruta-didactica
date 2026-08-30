import Image from "next/image";
import Link from "next/link";
import {
  coverages,
  formatMXN,
  priceTiers,
  routePriceMatrix,
  routes,
  CoverageKey,
  PriceTierKey,
  RouteKey,
} from "@/lib/data";
import RouteCards from "@/components/RouteCards";
import FAQAccordion from "@/components/FAQAccordion";
import Reveal from "@/components/Reveal";
import { ArrowRightIcon } from "@/components/icons";

const routeKeys = Object.keys(routes) as RouteKey[];
const tierKeys = Object.keys(priceTiers) as PriceTierKey[];
const coverageKeys = Object.keys(coverages) as CoverageKey[];

const stats = [
  { value: "4", label: "rutas" },
  { value: "4", label: "coberturas" },
  { value: "185", label: "jornadas efectivas" },
  { value: "2026-2027", label: "ciclo escolar" },
];

const steps = [
  {
    n: "1",
    title: "Elige tu grado",
    text: "De primero a sexto de primaria. Cada grado es una compra independiente, con sus propios contenidos y archivos.",
  },
  {
    n: "2",
    title: "Elige tu cobertura",
    text: "El periodo que quieres cubrir determina cuántas jornadas y archivos se habilitan.",
    chips: true,
  },
  {
    n: "3",
    title: "Elige tu ruta",
    text: "El nivel de acompañamiento: planeación y fichas, apoyo visual, seguimiento pedagógico, o todo junto.",
  },
];

const recursos = [
  "Planeación y fichas",
  "Diapositivas de apoyo visual",
  "Seguimiento pedagógico en Excel",
];

const faqItems = [
  {
    question: "¿Qué decide el precio de mi compra?",
    answer:
      "Tres cosas: el grado (1° a 6°), la cobertura temporal (quincena, mes, trimestre o ciclo completo) y la ruta de recursos (Base, Visual, Seguimiento o Integral). El precio corresponde al bloque pedagógico completo, no a una tarifa diaria.",
  },
  {
    question: "¿Toda quincena cuesta lo mismo?",
    answer:
      "Sí. Cualquier quincena de 7 a 10 jornadas efectivas mantiene el mismo precio dentro de su ruta, sin importar su duración exacta.",
  },
  {
    question: "¿Puedo ampliar mi cobertura más adelante?",
    answer:
      "Sí. Si pasas de quincena a mes, de mes a trimestre o de trimestre a ciclo completo, se acredita lo ya pagado y solo cubres la diferencia, siempre dentro del mismo grado y ruta.",
  },
  {
    question: "¿Puedo cambiar de ruta después de comprar?",
    answer:
      "Sí. Puedes subir de Base a Visual o Seguimiento, o a Integral desde cualquiera, pagando únicamente la diferencia de la misma cobertura. Los créditos no se transfieren entre grados.",
  },
  {
    question: "¿Cómo funciona el cierre anual?",
    answer:
      "Es un bloque especial de 14 jornadas (21 de junio al 9 de julio) con precio propio. Puede comprarse por separado o viene incluido automáticamente al adquirir el ciclo completo.",
  },
  {
    question: "¿Aplican cupones o promociones?",
    answer:
      "Solo cuando una campaña lo indique expresamente. Los beneficios por nivel de cobertura no se acumulan entre sí y no se hacen devoluciones retroactivas por compras separadas.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <Reveal className="mb-10 max-w-2xl">
      {eyebrow && (
        <p
          className={`text-xs font-bold uppercase tracking-wider ${
            light ? "text-rd-sky" : "text-rd-violet"
          }`}
        >
          {eyebrow}
        </p>
      )}
      <h2 className={`mt-2 text-2xl sm:text-3xl font-extrabold ${light ? "text-white" : "text-rd-navy"}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-3 ${light ? "text-slate-300" : "text-slate-600"}`}>{subtitle}</p>
      )}
    </Reveal>
  );
}

export default function PlanesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div
          aria-hidden
          className="animate-rd-blob pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-rd-turquoise/15 blur-3xl"
        />
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 pt-16 lg:pt-24 pb-14 lg:pb-20 text-center">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-wider text-rd-violet">
              Precios · Ciclo 2026-2027
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold text-rd-navy leading-tight">
              Elige el acompañamiento justo para tu grupo
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 text-lg text-slate-600 mx-auto max-w-lg">
              Una sola licencia docente por grado: la ruta completa. Combina el periodo que quieres
              cubrir con el nivel de recursos que necesitas, y paga solo por eso.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              {stats.map((s, i) => (
                <span key={s.label} className="flex items-center gap-6">
                  {i > 0 && <span className="h-4 w-px bg-slate-300" aria-hidden />}
                  <span>
                    <span className="font-bold text-rd-navy">{s.value}</span>{" "}
                    <span className="text-slate-500">{s.label}</span>
                  </span>
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.32}>
            <Link
              href="#rutas"
              className="mt-8 inline-flex items-center gap-2 rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-rd-navy hover:shadow-lg hover:shadow-rd-violet/20"
            >
              Elegir mi ruta
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-rd-navy">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
          <SectionHeading eyebrow="Cómo comprar" title="Arma tu compra en 3 pasos" light />
          <div className="grid sm:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="h-full rounded-rd-md border border-white/10 bg-white/5 p-6 transition-colors hover:border-rd-turquoise/40">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rd-turquoise text-sm font-bold text-rd-navy">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{s.text}</p>
                  {s.chips && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {coverageKeys.map((key) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white"
                        >
                          <Image src={coverages[key].icon} alt="" width={16} height={16} className="h-4 w-4" />
                          {coverages[key].label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Rutas comerciales */}
      <section id="rutas" className="relative scroll-mt-20 overflow-hidden bg-gradient-to-b from-rd-navy to-[#0b1f45]">
        <div
          aria-hidden
          className="animate-rd-blob pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-rd-violet/20 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-rd-blob-slow pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-rd-turquoise/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <SectionHeading
            eyebrow="Rutas comerciales"
            title="Cuatro niveles de acompañamiento"
            subtitle="Elige tu grado y cobertura, y compra directamente. Cada ruta suma más recursos sin cambiar la cobertura temporal."
            light
          />
          <RouteCards />
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-white">Entre más cobertura, mayor ahorro:</span> el mes
            ya ahorra frente a dos quincenas, el trimestre suma un descuento adicional y el ciclo
            completo llega hasta 24% de ahorro frente a comprar por partes.
          </p>
        </div>
      </section>

      {/* Comparar */}
      <section id="precios" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <SectionHeading eyebrow="Compara y elige" title="¿Qué incluye cada ruta?" />
          <div className="overflow-x-auto rounded-rd-lg border border-slate-200 mb-16">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Comparación detallada de rutas</caption>
              <thead className="bg-slate-50 text-rd-navy">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Incluye
                  </th>
                  {routeKeys.map((key) => (
                    <th key={key} scope="col" className="px-4 py-3 font-semibold text-center">
                      {routes[key].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recursos.map((row) => (
                  <tr key={row}>
                    <td className="px-4 py-3 font-medium text-rd-navy">{row}</td>
                    {routeKeys.map((key) => (
                      <td key={key} className="px-4 py-3 text-center">
                        {routes[key].includes.includes(row) ? (
                          <span className="text-rd-turquoise font-bold" aria-label="Incluido">
                            ✓
                          </span>
                        ) : (
                          <span className="text-slate-300" aria-label="No incluido">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionHeading
            eyebrow="Precios"
            title="Precios por cobertura"
            subtitle="Pesos mexicanos · precio por grado · licencia docente individual."
          />
          <div className="overflow-x-auto rounded-rd-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Precios públicos por cobertura y ruta</caption>
              <thead className="bg-slate-50 text-rd-navy">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Cobertura
                  </th>
                  {routeKeys.map((key) => (
                    <th key={key} scope="col" className="px-4 py-3 font-semibold text-center">
                      {routes[key].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tierKeys.map((tier) => (
                  <tr key={tier}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-rd-navy">{priceTiers[tier].label}</span>
                      <span className="block text-[11px] text-slate-400">{priceTiers[tier].detail}</span>
                    </td>
                    {routeKeys.map((key) => (
                      <td key={key} className="px-4 py-3 text-center font-semibold text-rd-navy">
                        {formatMXN(routePriceMatrix[key][tier])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <SectionHeading eyebrow="Dudas frecuentes" title="Preguntas frecuentes" />
          <FAQAccordion items={faqItems} />
        </div>
      </section>

      {/* CTA de cierre */}
      <section className="bg-gradient-to-br from-rd-violet to-rd-navy">
        <Reveal>
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              ¿Listo para elegir tu ruta?
            </h2>
            <p className="mt-3 text-slate-200">
              Sube al selector, elige tu grado y cobertura, y agrega tu ruta al carrito.
            </p>
            <Link
              href="#rutas"
              className="mt-7 group inline-flex items-center gap-2 rounded-rd-md bg-white px-6 py-3 text-sm font-semibold text-rd-navy hover:bg-rd-sky transition-colors"
            >
              Elegir mi ruta
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
