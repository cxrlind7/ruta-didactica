"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cartItemTexto, useStore } from "@/lib/store";
import { formatMXN } from "@/lib/data";

export default function CarritoPage() {
  const { cart, removeFromCart, cartTotal, hydrated } = useStore();

  if (hydrated && cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-rd-navy">Tu carrito está vacío</h1>
        <p className="mt-2 text-slate-500">Elige una ruta completa para tu grupo o solo la clase que necesitas.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/planes"
            className="inline-flex rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white hover:bg-rd-navy transition"
          >
            Ver rutas y precios
          </Link>
          <Link
            href="/clases"
            className="inline-flex rounded-rd-md border border-slate-300 px-6 py-3 text-sm font-semibold text-rd-navy hover:border-rd-sky transition"
          >
            Ver clases sueltas
          </Link>
        </div>
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
              const texto = cartItemTexto(item);
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
                    src={texto.icon}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 object-contain rounded-rd-sm bg-slate-50 p-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-rd-navy">{texto.titulo}</p>
                    <p className="text-xs text-slate-500 mt-1">{texto.detalle}</p>
                  </div>
                  <span className="text-sm font-bold text-rd-navy whitespace-nowrap">{formatMXN(item.priceMXN)}</span>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-xs font-semibold text-slate-400 hover:text-cur-etica hover:underline ml-2"
                    aria-label={`Quitar ${texto.titulo} del carrito`}
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
            <span>{cart.length} {cart.length === 1 ? "artículo" : "artículos"}</span>
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
          <div className="mt-3 flex justify-center gap-4 text-xs font-semibold text-rd-violet">
            <Link href="/planes" className="hover:underline">
              Seguir viendo rutas
            </Link>
            <Link href="/clases" className="hover:underline">
              Ver clases sueltas
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
