"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { coverages, formatMXN, gradeLabel, routes } from "@/lib/data";

export default function CarritoPage() {
  const { cart, removeFromCart, cartTotal, hydrated } = useStore();

  if (hydrated && cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-rd-navy">Tu carrito está vacío</h1>
        <p className="mt-2 text-slate-500">Elige la ruta, grado y cobertura que necesitas para tu grupo.</p>
        <Link
          href="/planes"
          className="mt-6 inline-flex rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white hover:bg-rd-navy transition"
        >
          Ver rutas y precios
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-extrabold text-rd-navy mb-8">Carrito</h1>

      <div className="grid lg:grid-cols-[1fr_320px] gap-10">
        <ul className="divide-y divide-slate-200 border-y border-slate-200">
          <AnimatePresence initial={false}>
            {cart.map((item) => {
              const route = routes[item.route];
              return (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-4 py-4"
                >
                  <Image
                    src={route.icon}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 object-contain rounded-rd-sm bg-slate-50 p-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-rd-navy">{route.label}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {gradeLabel(item.grade)} · {coverages[item.coverage].label}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-rd-navy whitespace-nowrap">{formatMXN(item.priceMXN)}</span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-xs font-semibold text-slate-400 hover:text-cur-etica hover:underline ml-2"
                    aria-label={`Quitar ${route.label} del carrito`}
                  >
                    Quitar
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        <div className="h-fit rounded-rd-lg border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-sm font-semibold text-rd-navy mb-4">Resumen</h2>
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>{cart.length} {cart.length === 1 ? "ruta" : "rutas"}</span>
            <span>{formatMXN(cartTotal)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-rd-navy border-t border-slate-200 pt-3 mt-3">
            <span>Total</span>
            <span>{formatMXN(cartTotal)}</span>
          </div>
          <Link
            href="/checkout"
            className="mt-6 flex items-center justify-center rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-bold text-white hover:bg-rd-navy transition"
          >
            Continuar a pago
          </Link>
          <Link
            href="/planes"
            className="mt-3 flex items-center justify-center text-xs font-semibold text-rd-violet hover:underline"
          >
            Seguir explorando rutas
          </Link>
        </div>
      </div>
    </div>
  );
}
