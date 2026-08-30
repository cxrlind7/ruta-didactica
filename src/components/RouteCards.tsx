"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  CoverageKey,
  RouteKey,
  coverages,
  formatMXN,
  gradeIcon,
  gradeLabel,
  grades,
  priceForRoute,
  routes,
} from "@/lib/data";
import { useStore } from "@/lib/store";
import { CheckIcon } from "./icons";

const routeKeys = Object.keys(routes) as RouteKey[];
const coverageKeys = Object.keys(coverages) as CoverageKey[];

// La ruta "visual" es la recomendada: se muestra elevada, como el plan
// destacado de una tabla de precios.
const ELEVATED_ROUTE: RouteKey = "visual";

const badgeStyles: Record<string, string> = {
  visual: "bg-rd-violet text-white",
  integral: "bg-rd-turquoise text-rd-navy",
};

// La entrada se dispara al montar (no al hacer scroll hasta la sección):
// las tarjetas son el contenido principal de la página, así que no pueden
// depender de un IntersectionObserver que, con un scroll rápido, las deje
// a medio aparecer (opacity 0) y se vean "rotas". Para cuando el usuario
// llega hasta aquí, la animación ya terminó.
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

export default function RouteCards() {
  const [grade, setGrade] = useState<number>(1);
  const [coverage, setCoverage] = useState<CoverageKey>("quincena");
  const { addToCart, isInCart } = useStore();
  const router = useRouter();

  function buyNow(route: RouteKey) {
    addToCart(route, grade, coverage);
    router.push("/checkout");
  }

  return (
    <div className="mb-10">
      {/* Selector de grado y cobertura */}
      <div className="mb-10 grid gap-6 rounded-rd-lg border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm sm:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-rd-sky">1. Elige tu grado</p>
          <div className="flex flex-wrap gap-2">
            {grades.map((g) => {
              const active = grade === g;
              return (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  aria-pressed={active}
                  aria-label={gradeLabel(g)}
                  className={`flex h-12 w-12 items-center justify-center rounded-rd-sm border p-1 transition-all ${
                    active
                      ? "border-rd-turquoise bg-rd-turquoise/10 ring-2 ring-rd-turquoise/40"
                      : "border-white/10 opacity-60 hover:opacity-100 hover:border-rd-sky/60"
                  }`}
                >
                  <Image src={gradeIcon(g)} alt={gradeLabel(g)} width={40} height={40} className="h-full w-full object-contain" />
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-rd-sky">2. Elige tu cobertura</p>
          <div className="flex flex-wrap gap-2">
            {coverageKeys.map((key) => {
              const active = coverage === key;
              return (
                <button
                  key={key}
                  onClick={() => setCoverage(key)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                    active
                      ? "border-rd-turquoise bg-rd-turquoise text-rd-navy"
                      : "border-white/15 text-white hover:border-rd-sky/60"
                  }`}
                >
                  <Image src={coverages[key].icon} alt="" width={16} height={16} className="h-4 w-4 object-contain" />
                  {coverages[key].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {routeKeys.map((key, i) => {
          const route = routes[key];
          const elevated = key === ELEVATED_ROUTE;
          const price = priceForRoute(key, coverage);
          const inCart = isInCart(key, grade, coverage);

          return (
            <motion.div
              key={key}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              whileHover={{ y: elevated ? -14 : -6 }}
              className={[
                "group relative flex h-full flex-col rounded-2xl border p-7 transition-shadow duration-300",
                elevated
                  ? "z-10 border-rd-violet/40 bg-gradient-to-b from-rd-violet/[0.16] via-white/[0.04] to-white/[0.02] shadow-[0_25px_70px_-25px_rgba(111,60,203,0.55)] hover:shadow-[0_30px_80px_-20px_rgba(111,60,203,0.7)] lg:-translate-y-4"
                  : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:shadow-[0_20px_45px_-25px_rgba(0,183,195,0.35)]",
              ].join(" ")}
            >
              {route.badge && (
                <span
                  className={[
                    "absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold shadow-sm",
                    badgeStyles[key] ?? "bg-rd-violet text-white",
                  ].join(" ")}
                >
                  {route.badge}
                </span>
              )}

              <Image
                src={route.icon}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 object-contain transition-transform duration-300 group-hover:scale-110"
              />
              <h3 className="mt-4 text-lg font-bold text-white">{route.label}</h3>
              {!route.badge && (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rd-sky">{route.subtitle}</p>
              )}

              <p className="mt-5 flex items-baseline gap-1.5">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`${key}-${coverage}`}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.2 }}
                    className={elevated ? "text-4xl font-extrabold text-white" : "text-3xl font-extrabold text-white"}
                  >
                    {formatMXN(price)}
                  </motion.span>
                </AnimatePresence>
                <span className="text-xs font-medium text-slate-400">{coverages[coverage].label.toLowerCase()}</span>
              </p>
              <p className="text-[11px] text-slate-400">{gradeLabel(grade)} · licencia docente</p>

              <p className="mt-4 text-sm leading-relaxed text-slate-300">{route.tagline}</p>

              <motion.ul
                variants={listVariants}
                className="mt-5 flex-1 space-y-2.5 border-t border-white/10 pt-5 text-sm text-slate-300"
              >
                {route.bullets.map((b) => (
                  <motion.li key={b} variants={itemVariants} className="flex items-start gap-2.5">
                    <CheckIcon
                      className={`mt-0.5 h-5 w-5 shrink-0 ${elevated ? "text-rd-violet" : "text-rd-turquoise"}`}
                    />
                    <span>{b}</span>
                  </motion.li>
                ))}
              </motion.ul>

              <div className="mt-7 flex flex-col gap-2">
                {inCart ? (
                  <Link
                    href="/carrito"
                    className="inline-flex items-center justify-center gap-2 rounded-rd-md bg-fn-inicio px-4 py-2.5 text-sm font-bold text-rd-navy transition hover:brightness-95"
                  >
                    <CheckIcon className="h-4 w-4" /> En tu carrito · ver
                  </Link>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => addToCart(key, grade, coverage)}
                    className={[
                      "relative inline-flex items-center justify-center rounded-rd-md px-4 py-2.5 text-sm font-semibold transition-colors",
                      elevated
                        ? "bg-rd-violet text-white hover:bg-white hover:text-rd-navy"
                        : "border border-white/15 text-white hover:border-white/40 hover:bg-white/10",
                    ].join(" ")}
                  >
                    Agregar al carrito
                  </motion.button>
                )}
                <button
                  onClick={() => buyNow(key)}
                  className="text-xs font-semibold text-rd-sky hover:text-white hover:underline"
                >
                  Comprar ahora
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
