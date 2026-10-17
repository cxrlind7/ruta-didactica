"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { cartItemTexto, useStore } from "@/lib/store";
import { formatMXN } from "@/lib/data";
import AyudaCompra from "@/components/AyudaCompra";

type DisplayItem = { id: string; label: string; priceMXN: number };
type DisplayOrder = { id: string; date: string; items: DisplayItem[]; total: number };

type FetchedOrder = {
  status: string;
  order: {
    id: string;
    total: number;
    createdAt: string;
    items: DisplayItem[];
  };
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
}

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmacionContent />
    </Suspense>
  );
}

function ConfirmacionContent() {
  const { lastOrder, hydrated } = useStore();
  const searchParams = useSearchParams();
  const [needsPassword, setNeedsPassword] = useState<{ email: string } | null>(null);
  const [accountChecked, setAccountChecked] = useState(false);

  // El pago con link (Checkout Pro) sale del sitio y vuelve por
  // back_urls.success con una recarga completa -- a diferencia del pago con
  // tarjeta (que nunca sale del sitio), acá no hay `lastOrder` en el estado
  // local del carrito. Mercado Pago manda external_reference (nuestro
  // orderId) de vuelta, así que se puede pedir el resumen real al servidor.
  const externalReference = searchParams.get("external_reference");
  const [fetchedOrder, setFetchedOrder] = useState<FetchedOrder | "loading" | "not_found" | null>(
    externalReference ? "loading" : null
  );

  useEffect(() => {
    if (!externalReference) return;
    fetch(`/api/orders/${externalReference}/status`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: FetchedOrder) => setFetchedOrder(data))
      .catch(() => setFetchedOrder("not_found"));
  }, [externalReference]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then(
        (data: {
          account: { email: string; hasPassword: boolean } | null;
          guest: { email: string; hasPassword: boolean } | null;
        }) => {
          // Una compra como invitado (sin contraseña) ya no abre sesión: la
          // biblioteca queda bloqueada hasta crear la contraseña.
          const comprador = data.guest ?? data.account;
          if (comprador && !comprador.hasPassword) {
            setNeedsPassword({ email: comprador.email });
          }
        }
      )
      .catch(() => {})
      .finally(() => setAccountChecked(true));
  }, []);

  // Si la URL trae external_reference, se acaba de volver de un pago por
  // link (Checkout Pro) -- ese resumen del servidor manda siempre, aunque
  // `lastOrder` tenga una compra vieja guardada en localStorage de una
  // sesión anterior (si no, se mostraría el pedido equivocado).
  const displayOrder: DisplayOrder | null = externalReference
    ? fetchedOrder && fetchedOrder !== "loading" && fetchedOrder !== "not_found" && fetchedOrder.status === "approved"
      ? {
          id: fetchedOrder.order.id,
          date: formatDate(fetchedOrder.order.createdAt),
          total: fetchedOrder.order.total,
          items: fetchedOrder.order.items,
        }
      : null
    : lastOrder && {
        ...lastOrder,
        items: lastOrder.items.map((item) => {
          const texto = cartItemTexto(item);
          return { id: item.id, label: `${texto.titulo} · ${texto.detalle}`, priceMXN: item.priceMXN };
        }),
      };

  if (fetchedOrder === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-sm text-slate-400">Confirmando tu pago…</p>
      </div>
    );
  }

  if (!displayOrder && (hydrated || fetchedOrder === "not_found")) {
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

  if (!displayOrder) return null;

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
        Compra confirmada. Tu material ya está disponible en tu biblioteca.
      </motion.h1>
      <p className="mt-2 text-sm text-slate-500">
        Pedido {displayOrder.id} · {displayOrder.date}
      </p>

      <ul className="mt-8 divide-y divide-slate-200 border-y border-slate-200 text-left">
        {displayOrder.items.map((item) => (
          <li key={item.id} className="flex justify-between py-3 text-sm">
            <span className="text-rd-navy font-medium">
              {item.label}
            </span>
            <span className="font-semibold text-slate-500">{formatMXN(item.priceMXN)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between text-base font-bold text-rd-navy">
        <span>Total pagado</span>
        <span>{formatMXN(displayOrder.total)}</span>
      </div>

      {needsPassword && (
        <div className="mt-8 rounded-rd-md border border-rd-violet/30 bg-rd-violet/5 p-5 text-left">
          <p className="text-sm font-semibold text-rd-navy">Crea una contraseña para tu cuenta</p>
          <p className="mt-1 text-xs text-slate-500">
            Compraste con <span className="font-medium">{needsPassword.email}</span>. Ponle una contraseña a esta
            cuenta para poder volver a ver tu material después, desde cualquier dispositivo.
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
        {accountChecked && !needsPassword ? (
          <Link
            href="/biblioteca"
            className="rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-bold text-white hover:bg-rd-navy transition"
          >
            Ir a mi biblioteca
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="Crea tu contraseña primero para entrar a tu biblioteca"
            className="cursor-not-allowed rounded-rd-md bg-slate-200 px-6 py-3 text-sm font-bold text-slate-400"
          >
            Ir a mi biblioteca
          </button>
        )}
        <Link
          href="/planes"
          className="rounded-rd-md border border-slate-300 px-6 py-3 text-sm font-bold text-rd-navy hover:border-rd-sky transition"
        >
          Seguir explorando
        </Link>
      </div>

      <AyudaCompra className="mt-8" />
    </div>
  );
}
