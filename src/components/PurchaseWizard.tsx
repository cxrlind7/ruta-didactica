"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CoverageKey, RouteKey, RUTA_CODE, coverages, formatMXN, gradeIcon, gradeLabel, grades, routes } from "@/lib/data";
import { useStore } from "@/lib/store";
import { CheckIcon } from "@/components/icons";

const coverageKeys = Object.keys(coverages) as CoverageKey[];
const routeKeys = Object.keys(routes) as RouteKey[];
const TRIMESTRE_TAB_LABEL: Record<string, string> = { T1: "Trimestre 1", T2: "Trimestre 2", T3: "Trimestre 3", CA: "Cierre anual" };

type Producto = { codigo: string; cobertura: string; ruta: string; precioMXN: number };
type Periodo = { value: string; label: string; shortLabel: string };

function periodoGroup(value: string): string {
  return value.includes("_") ? value.split("_")[0] : value;
}

// Selector de compra en 3 pasos: 1) grado (obligatorio para avanzar), 2)
// cobertura, 3) ruta + periodo real. Termina en "agregar al carrito" -- el
// checkbox legal, el resumen final y el pago viven en /carrito y /checkout.
export default function PurchaseWizard() {
  const { addToCart, setAccountLocal } = useStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [grado, setGrado] = useState<number | null>(null);
  const [cobertura, setCobertura] = useState<CoverageKey | null>(null);
  const [periodosState, setPeriodosState] = useState<{ key: string; periodos: Periodo[] } | null>(null);
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [periodTab, setPeriodTab] = useState<string | null>(null);
  const [selectedRuta, setSelectedRuta] = useState<RouteKey | null>(null);

  const [productos, setProductos] = useState<Producto[] | null>(null);

  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    fetch("/api/payment-products")
      .then((r) => r.json())
      .then((d: { productos: Producto[] }) => setProductos(d.productos))
      .catch(() => setProductos([]));
  }, []);

  const periodosKey = grado != null && cobertura != null ? `${grado}|${cobertura}` : null;
  const periodos = periodosState && periodosState.key === periodosKey ? periodosState.periodos : null;

  useEffect(() => {
    if (grado == null || cobertura == null) return;
    let cancelled = false;
    const key = `${grado}|${cobertura}`;
    fetch(`/api/periodos?grado=${grado}&cobertura=${cobertura}`)
      .then((r) => r.json())
      .then((d: { periodos: Periodo[] }) => {
        if (!cancelled) setPeriodosState({ key, periodos: d.periodos });
      })
      .catch(() => {
        if (!cancelled) setPeriodosState({ key, periodos: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [grado, cobertura]);

  function selectGrado(g: number) {
    setGrado(g);
    setCobertura(null);
    setPeriodo(null);
    setSelectedRuta(null);
    setAddedToCart(false);
    setStep(2);
  }

  function selectCobertura(c: CoverageKey) {
    setCobertura(c);
    setPeriodo(null);
    setSelectedRuta(null);
    setAddedToCart(false);
    setStep(3);
  }

  function priceFor(ruta: RouteKey): number | null {
    if (!cobertura || !productos) return null;
    const p = productos.find((p) => p.cobertura === cobertura && p.ruta === RUTA_CODE[ruta]);
    return p?.precioMXN ?? null;
  }

  function selectRuta(ruta: RouteKey) {
    setSelectedRuta(ruta);
    setAddedToCart(false);
  }

  function handleAddToCart() {
    if (!grado || !cobertura || !periodo || !selectedRuta || totalMXN == null) return;
    const periodoLabel = periodos?.find((p) => p.value === periodo)?.label ?? periodo;
    addToCart(selectedRuta, grado, cobertura, periodo, periodoLabel, totalMXN);
    if (payerEmail.trim()) setAccountLocal(payerEmail.trim(), payerName.trim());
    setAddedToCart(true);
  }

  function addAnother() {
    setPeriodo(null);
    setSelectedRuta(null);
    setAddedToCart(false);
  }

  const totalMXN = selectedRuta ? priceFor(selectedRuta) : null;
  const canAdd = !!payerName.trim() && !!payerEmail.includes("@");

  const periodGroups = Array.from(new Set((periodos ?? []).map((p) => periodoGroup(p.value))));
  const groupPeriods = cobertura === "quincena" && periodGroups.length > 1;
  const activeGroup = groupPeriods ? (periodTab && periodGroups.includes(periodTab) ? periodTab : periodGroups[0]) : null;
  const visiblePeriodos = groupPeriods ? (periodos ?? []).filter((p) => periodoGroup(p.value) === activeGroup) : periodos;

  return (
    <div className="mb-10">
      {/* Indicador de pasos */}
      <div className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/50">
        {[
          { n: 1, label: "Grado" },
          { n: 2, label: "Cobertura" },
          { n: 3, label: "Ruta y periodo" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-6 bg-white/15" aria-hidden />}
            <button
              type="button"
              disabled={s.n > step}
              onClick={() => s.n < step && setStep(s.n as 1 | 2 | 3)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
                s.n === step
                  ? "bg-rd-turquoise text-rd-navy"
                  : s.n < step
                    ? "text-rd-turquoise hover:underline"
                    : "text-white/30"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px]">
                {s.n < step ? <CheckIcon className="h-3.5 w-3.5" /> : s.n}
              </span>
              {s.label}
            </button>
          </div>
        ))}
      </div>

      {/* Paso 1: grado */}
      {step === 1 && (
        <div className="rounded-rd-lg border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
          <p className="text-sm font-bold text-white">¿Para qué grado quieres el material?</p>
          <p className="mt-1 text-xs text-slate-300">Cada grado es una compra independiente, con sus propios archivos.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {grades.map((g) => (
              <button
                key={g}
                onClick={() => selectGrado(g)}
                className="flex h-16 w-16 items-center justify-center rounded-rd-sm border border-white/10 p-1.5 transition-all hover:border-rd-turquoise hover:bg-rd-turquoise/10"
              >
                <Image src={gradeIcon(g)} alt={gradeLabel(g)} width={56} height={56} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paso 2: cobertura */}
      {step === 2 && grado != null && (
        <div className="rounded-rd-lg border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
          <button type="button" onClick={() => setStep(1)} className="text-xs font-semibold text-rd-sky hover:underline">
            ← Cambiar grado
          </button>
          <p className="mt-3 text-sm font-bold text-white">
            {gradeLabel(grado)} de primaria · ¿qué periodo quieres cubrir?
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {coverageKeys.map((key) => (
              <button
                key={key}
                onClick={() => selectCobertura(key)}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-rd-turquoise hover:bg-rd-turquoise/10"
              >
                <Image src={coverages[key].icon} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                {coverages[key].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paso 3: ruta + periodo + agregar al carrito */}
      {step === 3 && grado != null && cobertura != null && (
        <div className="space-y-5">
          <div className="rounded-rd-lg border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <button type="button" onClick={() => setStep(1)} className="font-semibold text-rd-sky hover:underline">
                ← {gradeLabel(grado)}
              </button>
              <span className="text-white/30">·</span>
              <button type="button" onClick={() => setStep(2)} className="font-semibold text-rd-sky hover:underline">
                {coverages[cobertura].label}
              </button>
            </div>

            <p className="mt-3 text-sm font-bold text-white">Elige tu ruta</p>
            <p className="text-xs text-slate-300">El nivel de acompañamiento que quieres para este periodo.</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {routeKeys.map((key) => {
                const route = routes[key];
                const price = priceFor(key);
                const active = selectedRuta === key;
                return (
                  <button
                    key={key}
                    onClick={() => price != null && selectRuta(key)}
                    disabled={price == null}
                    className={`flex flex-col rounded-rd-md border p-5 text-left transition ${
                      active
                        ? "border-rd-violet bg-rd-violet/15"
                        : "border-white/10 bg-white/[0.035] hover:border-white/25"
                    } disabled:opacity-40`}
                  >
                    <Image src={route.icon} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
                    <p className="mt-3 text-sm font-bold text-white">{route.label}</p>
                    <p className="mt-1 text-2xl font-extrabold text-white">
                      {price != null ? formatMXN(price) : "No disponible"}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">{route.tagline}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedRuta && (
            <div className="rounded-rd-lg border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
              <p className="text-sm font-bold text-white">Elige el periodo</p>
              {periodos === null ? (
                <p className="mt-3 text-xs text-slate-400">Cargando periodos disponibles…</p>
              ) : periodos.length === 0 ? (
                <p className="mt-3 text-xs text-amber-300">
                  Todavía no hay periodos publicados para {gradeLabel(grado)} en esta cobertura.
                </p>
              ) : (
                <>
                  {groupPeriods && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {periodGroups.map((g) => (
                        <button
                          key={g}
                          onClick={() => setPeriodTab(g)}
                          className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                            activeGroup === g
                              ? "border-rd-sky bg-rd-sky/20 text-white"
                              : "border-white/10 text-slate-300 hover:border-white/30"
                          }`}
                        >
                          {TRIMESTRE_TAB_LABEL[g] ?? g}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {visiblePeriodos?.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPeriodo(p.value)}
                        className={`rounded-rd-sm border px-3 py-1.5 text-xs font-bold transition ${
                          periodo === p.value
                            ? "border-rd-turquoise bg-rd-turquoise text-rd-navy"
                            : "border-white/15 text-white hover:border-rd-sky/60"
                        }`}
                      >
                        {groupPeriods ? p.shortLabel : p.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {periodo && selectedRuta && totalMXN != null && (
            <div className="rounded-rd-lg border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
              <p className="text-sm font-bold text-white">Resumen de esta ruta</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-200">
                <li>
                  <span className="text-slate-400">Grado:</span> {gradeLabel(grado)}
                </li>
                <li>
                  <span className="text-slate-400">Periodo:</span> {periodos?.find((p) => p.value === periodo)?.label}
                </li>
                <li>
                  <span className="text-slate-400">Ruta:</span> {routes[selectedRuta].label}
                </li>
                <li>
                  <span className="text-slate-400">Incluye:</span> {routes[selectedRuta].includes.join(" · ")}
                </li>
                <li className="pt-1 text-lg font-extrabold text-white">Precio: {formatMXN(totalMXN)}</li>
              </ul>

              {addedToCart ? (
                <div className="mt-5 rounded-rd-sm border border-emerald-400/30 bg-emerald-400/10 p-4 text-center">
                  <p className="text-sm font-bold text-emerald-300">Se agregó a tu carrito.</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Link
                      href="/carrito"
                      className="inline-flex rounded-rd-md bg-white px-5 py-2.5 text-sm font-semibold text-rd-navy hover:bg-rd-sky"
                    >
                      Ir al carrito
                    </Link>
                    <button
                      type="button"
                      onClick={addAnother}
                      className="inline-flex rounded-rd-md border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:border-white/40"
                    >
                      Agregar otra ruta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Tu nombre"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      className="rounded-rd-sm border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-rd-turquoise focus:outline-none"
                    />
                    <input
                      type="email"
                      placeholder="Tu correo"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      className="rounded-rd-sm border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-rd-turquoise focus:outline-none"
                    />
                  </div>

                  {!canAdd ? (
                    <p className="text-xs text-slate-400">Completa tu nombre y correo para agregar esta ruta al carrito.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="inline-flex items-center gap-2 rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white hover:bg-white hover:text-rd-navy"
                    >
                      Agregar al carrito
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
