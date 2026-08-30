import Link from "next/link";
import Image from "next/image";
import { formatMXN, gradeIcon, gradeLabel, grades, routes } from "@/lib/data";
import { ArrowRightIcon } from "@/components/icons";
import Reveal from "@/components/Reveal";

const routeKeys = Object.keys(routes) as (keyof typeof routes)[];

const benefits = [
  {
    title: "Alineado al NEM 2022",
    description: "Contenido actualizado y listo para aplicar.",
    icon: <CheckIcon />,
  },
  {
    title: "Descargable e imprimible",
    description: "Utilízalo en el aula cuando lo necesites.",
    icon: <CloudIcon />,
  },
  {
    title: "Diseñado por docentes",
    description: "Materiales prácticos, claros y aplicables.",
    icon: <ShieldIcon />,
  },
  {
    title: "Acompañamiento continuo",
    description: "Recursos y soporte para tu práctica.",
    icon: <HeadsetIcon />,
  },
];

const steps = [
  { n: "1", title: "Elige tu ruta", text: "Base, Visual, Seguimiento o Integral: el nivel de acompañamiento que necesitas." },
  { n: "2", title: "Elige grado y cobertura", text: "De 1° a 6°, por quincena, mes, trimestre o ciclo completo." },
  { n: "3", title: "Descarga", text: "Compra y accede desde tu biblioteca cuando lo necesites." },
];

const stats = [
  { value: "4", label: "rutas comerciales" },
  { value: "6", label: "grados de primaria" },
  { value: "4", label: "coberturas temporales" },
  { value: "2026-2027", label: "ciclo escolar" },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div
          aria-hidden
          className="animate-rd-blob pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-rd-violet/20 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-rd-blob-slow pointer-events-none absolute -top-10 right-0 h-96 w-96 rounded-full bg-rd-turquoise/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 pt-16 lg:pt-24 pb-24 lg:pb-32 text-center">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rd-violet/20 bg-rd-violet/5 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rd-violet">
              Ciclo 2026-2027
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold text-rd-navy leading-tight">
              Cada aprendizaje
              <br /> tiene su camino.
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 text-lg text-slate-600 mx-auto max-w-md">
              Cuatro rutas de acompañamiento docente alineadas al NEM 2022, con planeación, apoyo visual y
              seguimiento pedagógico para primaria.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/planes"
                className="group inline-flex items-center gap-2 rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-rd-navy hover:shadow-lg hover:shadow-rd-violet/20"
              >
                Ver rutas y precios
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/ayuda#como-funciona"
                className="inline-flex items-center gap-2 rounded-rd-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-rd-navy transition-colors hover:border-rd-sky"
              >
                <PlayGlyph /> Ver cómo funciona
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.32}>
            <p className="mt-4 text-sm font-semibold text-rd-violet">
              Comienza con una quincena desde {formatMXN(routes.base.priceMXN)}.
            </p>
          </Reveal>
        </div>

        <svg
          className="absolute inset-x-0 bottom-0 w-full text-rd-turquoise"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            fillOpacity="0.15"
            d="M0,64 C320,120 720,0 1440,64 L1440,120 L0,120 Z"
          />
          <path fill="var(--rd-violet)" fillOpacity="0.12" d="M0,90 C420,40 1040,110 1440,50 L1440,120 L0,120 Z" />
        </svg>
      </section>

      {/* Rutas comerciales */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <Reveal className="max-w-2xl mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-rd-navy">Las 4 rutas</h2>
            <p className="mt-3 text-slate-600">
              Un solo tipo de producto: la ruta completa por grado. Cada ruta suma más recursos sin
              modificar la cobertura temporal.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {routeKeys.map((key, i) => (
              <Reveal key={key} delay={i * 0.08} y={32}>
                <Link
                  href="/planes"
                  className="group relative flex h-full flex-col rounded-rd-lg border border-slate-200 bg-white p-7 transition-all hover:-translate-y-1.5 hover:shadow-xl hover:border-rd-turquoise/50"
                >
                  {routes[key].badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-rd-turquoise px-3 py-1 text-[11px] font-bold text-white shadow-sm whitespace-nowrap">
                      {routes[key].badge}
                    </span>
                  )}
                  <Image
                    src={routes[key].icon}
                    alt=""
                    width={112}
                    height={112}
                    className="h-24 w-24 object-contain mx-auto transition-transform duration-300 group-hover:scale-110"
                  />
                  <h3 className="mt-4 text-center text-xl font-bold text-rd-navy">{routes[key].label}</h3>
                  {!routes[key].badge && (
                    <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-rd-violet">
                      {routes[key].subtitle}
                    </p>
                  )}
                  <ul className="mt-4 space-y-1.5 text-xs text-slate-600 flex-1">
                    {routes[key].bullets.map((b) => (
                      <li key={b} className="flex items-start gap-1.5">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rd-turquoise" aria-hidden />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 text-center text-3xl font-extrabold text-rd-navy">
                    {formatMXN(routes[key].priceMXN)}
                  </p>
                  <p className="text-center text-[11px] text-slate-400">desde quincena · por grado</p>
                  <span className="mt-4 inline-flex items-center justify-center gap-1 rounded-rd-md bg-rd-violet px-4 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-rd-navy">
                    Ver detalle
                    <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/planes"
              className="group inline-flex items-center gap-1 text-sm font-semibold text-rd-violet hover:underline"
            >
              Comparar rutas
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Grados */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <Reveal className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-rd-navy">La misma ruta, para los 6 grados de primaria</h2>
          <p className="mt-2 text-slate-500 max-w-xl mx-auto">
            Cada grado es una licencia docente independiente, con sus propios contenidos y archivos.
          </p>
        </Reveal>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {grades.map((g, i) => (
            <Reveal key={g} delay={i * 0.05} y={16}>
              <div className="flex items-center justify-center rounded-rd-md p-2 transition-transform hover:scale-105">
                <Image
                  src={gradeIcon(g)}
                  alt={gradeLabel(g)}
                  width={96}
                  height={96}
                  className="h-20 w-20 sm:h-24 sm:w-24 object-contain"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Beneficios */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14">
        <div className="rounded-rd-lg bg-slate-50 border border-slate-200 p-6 sm:p-10">
          <Reveal>
            <h2 className="text-2xl font-bold text-rd-navy mb-6">Todo en un solo lugar</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.08} className="flex flex-col gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rd-violet text-white transition-transform hover:scale-110">
                  {b.icon}
                </span>
                <p className="text-sm font-semibold text-rd-navy">{b.title}</p>
                <p className="text-xs text-slate-500">{b.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="bg-rd-navy">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <Reveal>
            <h2 className="text-2xl font-bold text-white mb-8">Cómo funciona</h2>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="h-full rounded-rd-md bg-white/5 border border-white/10 p-6 transition-colors hover:border-rd-turquoise/40">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rd-turquoise text-sm font-bold text-rd-navy">
                    {s.n}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-8 text-sm">
              {stats.map((s) => (
                <span key={s.label}>
                  <span className="font-bold text-white">{s.value}</span>{" "}
                  <span className="text-slate-400">{s.label}</span>
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-gradient-to-br from-rd-violet to-rd-navy">
        <Reveal>
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">¿Listo para elegir tu ruta?</h2>
            <p className="mt-3 text-slate-200">
              Compara las 4 rutas, elige tu grado y cobertura, y compra directamente desde ahí.
            </p>
            <Link
              href="/planes"
              className="group mt-7 inline-flex items-center gap-2 rounded-rd-md bg-white px-6 py-3 text-sm font-semibold text-rd-navy transition-colors hover:bg-rd-sky"
            >
              Ver rutas y precios
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CloudIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 18a4 4 0 01-.6-7.96A5.5 5.5 0 0117 9.5a4 4 0 01-1 7.87" strokeLinecap="round" />
      <path d="M12 12v6m0 0l-2.5-2.5M12 18l2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" strokeLinejoin="round" />
    </svg>
  );
}
function HeadsetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12a8 8 0 0116 0" strokeLinecap="round" />
      <rect x="3" y="12" width="4" height="6" rx="1.5" />
      <rect x="17" y="12" width="4" height="6" rx="1.5" />
      <path d="M19 18v1a3 3 0 01-3 3h-2" strokeLinecap="round" />
    </svg>
  );
}
function PlayGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
