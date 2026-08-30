"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { coverages, formatMXN, gradeLabel, routes } from "@/lib/data";

export default function ConfirmacionPage() {
  const { lastOrder, hydrated } = useStore();
  const [needsPassword, setNeedsPassword] = useState<{ email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { account: { email: string; hasPassword: boolean } | null }) => {
        if (data.account && !data.account.hasPassword) {
          setNeedsPassword({ email: data.account.email });
        }
      })
      .catch(() => {});
  }, []);

  if (hydrated && !lastOrder) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-rd-navy">Aún no hay una compra confirmada</h1>
        <p className="mt-2 text-slate-500">Cuando completes un pago, tu confirmación aparecerá aquí.</p>
        <Link
          href="/planes"
          className="mt-6 inline-flex rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white hover:bg-rd-navy"
        >
          Ver rutas y precios
        </Link>
      </div>
    );
  }

  if (!lastOrder) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16 text-center">
      <motion.span
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-fn-inicio text-rd-navy"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.span>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mt-6 text-2xl sm:text-3xl font-extrabold text-rd-navy"
      >
        Compra confirmada. Tus rutas ya están disponibles en tu biblioteca.
      </motion.h1>
      <p className="mt-2 text-sm text-slate-500">
        Pedido {lastOrder.id} · {lastOrder.date}
      </p>

      <ul className="mt-8 divide-y divide-slate-200 border-y border-slate-200 text-left">
        {lastOrder.items.map((item) => (
          <li key={item.id} className="flex justify-between py-3 text-sm">
            <span className="text-rd-navy font-medium">
              {routes[item.route].label} · {gradeLabel(item.grade)} · {coverages[item.coverage].label}
            </span>
            <span className="font-semibold text-slate-500">{formatMXN(item.priceMXN)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between text-base font-bold text-rd-navy">
        <span>Total pagado</span>
        <span>{formatMXN(lastOrder.total)}</span>
      </div>

      {needsPassword && (
        <div className="mt-8 rounded-rd-md border border-rd-violet/30 bg-rd-violet/5 p-5 text-left">
          <p className="text-sm font-semibold text-rd-navy">Crea una contraseña para tu cuenta</p>
          <p className="mt-1 text-xs text-slate-500">
            Compraste con <span className="font-medium">{needsPassword.email}</span>. Ponle una contraseña a esta
            cuenta para poder volver a ver tus rutas después, desde cualquier dispositivo.
          </p>
          <Link
            href={`/cuenta/registro?email=${encodeURIComponent(needsPassword.email)}`}
            className="mt-3 inline-flex rounded-rd-md bg-rd-violet px-5 py-2 text-xs font-bold text-white hover:bg-rd-navy transition"
          >
            Crear contraseña
          </Link>
        </div>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/biblioteca"
          className="rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-bold text-white hover:bg-rd-navy transition"
        >
          Ir a mi biblioteca
        </Link>
        <Link
          href="/planes"
          className="rounded-rd-md border border-slate-300 px-6 py-3 text-sm font-bold text-rd-navy hover:border-rd-sky transition"
        >
          Seguir explorando
        </Link>
      </div>
    </div>
  );
}
