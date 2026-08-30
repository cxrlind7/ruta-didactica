"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { coverages, formatMXN, gradeLabel, routes } from "@/lib/data";
import { isTestItem } from "@/lib/downloads";
import RealPaymentCheckout from "@/components/RealPaymentCheckout";

export default function CheckoutPage() {
  const { cart, cartTotal, checkout, account, isLoggedIn } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState(account?.email || "");
  const [name, setName] = useState(account?.name || "");
  const [payment, setPayment] = useState<"tarjeta" | "transferencia">("tarjeta");
  const [submitting, setSubmitting] = useState(false);
  const [contactConfirmed, setContactConfirmed] = useState(false);

  const isRealPaymentOrder = cart.length > 0 && cart.every((item) => isTestItem(item.id));

  function handleApproved() {
    checkout();
    router.push("/confirmacion");
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-rd-navy">No hay rutas para pagar</h1>
        <p className="mt-2 text-slate-500">Agrega una ruta a tu carrito antes de continuar.</p>
        <Link
          href="/planes"
          className="mt-6 inline-flex rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white hover:bg-rd-navy"
        >
          Ver rutas y precios
        </Link>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      checkout();
      router.push("/confirmacion");
    }, 600);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-extrabold text-rd-navy mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_320px] gap-10">
        {isRealPaymentOrder ? (
          <div className="space-y-8">
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-rd-navy mb-1">Datos de contacto</legend>
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-slate-500 mb-1">
                  Nombre completo
                </label>
                <input
                  id="name"
                  required
                  disabled={contactConfirmed}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-rd-sm border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rd-sky focus:border-rd-sky disabled:bg-slate-50"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-500 mb-1">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  disabled={contactConfirmed}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-rd-sm border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rd-sky focus:border-rd-sky disabled:bg-slate-50"
                  placeholder="tu@correo.com"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Pago de prueba con Mercado Pago: el acceso a la descarga se otorga a este correo.
                </p>
              </div>
              {!contactConfirmed && (
                <button
                  type="button"
                  disabled={!name || !email.includes("@")}
                  onClick={() => setContactConfirmed(true)}
                  className="w-full rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-bold text-white hover:bg-rd-navy transition disabled:opacity-40"
                >
                  Continuar al pago
                </button>
              )}
            </fieldset>

            {contactConfirmed && (
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-rd-navy mb-1">Pago con tarjeta de prueba</legend>
                <RealPaymentCheckout
                  itemIds={cart.map((item) => item.id)}
                  totalMXN={cartTotal}
                  payerEmail={email}
                  payerName={name}
                  onApproved={handleApproved}
                />
              </fieldset>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-rd-navy mb-1">Datos de contacto</legend>
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-slate-500 mb-1">
                  Nombre completo
                </label>
                <input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-rd-sm border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rd-sky focus:border-rd-sky"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-500 mb-1">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-rd-sm border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rd-sky focus:border-rd-sky"
                  placeholder="tu@correo.com"
                />
                {!isLoggedIn && (
                  <p className="mt-1 text-xs text-slate-400">
                    Con esta compra crearemos u ocuparemos tu cuenta de Ruta Didáctica.
                  </p>
                )}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-rd-navy mb-1">Método de pago (simulado)</legend>
              <label className="flex items-center gap-3 rounded-rd-sm border border-slate-300 p-3 has-[:checked]:border-rd-violet has-[:checked]:bg-rd-violet/5">
                <input
                  type="radio"
                  name="payment"
                  checked={payment === "tarjeta"}
                  onChange={() => setPayment("tarjeta")}
                />
                <span className="text-sm font-medium text-rd-navy">Tarjeta de crédito o débito</span>
              </label>
              <label className="flex items-center gap-3 rounded-rd-sm border border-slate-300 p-3 has-[:checked]:border-rd-violet has-[:checked]:bg-rd-violet/5">
                <input
                  type="radio"
                  name="payment"
                  checked={payment === "transferencia"}
                  onChange={() => setPayment("transferencia")}
                />
                <span className="text-sm font-medium text-rd-navy">Transferencia bancaria</span>
              </label>
              <p className="text-xs text-slate-400">
                Demo funcional: no se procesa ningún pago real ni se solicitan datos financieros.
              </p>
            </fieldset>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-bold text-white hover:bg-rd-navy transition disabled:opacity-60"
            >
              {submitting ? "Procesando…" : `Pagar ${formatMXN(cartTotal)}`}
            </button>
          </form>
        )}

        <div className="h-fit rounded-rd-lg border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-sm font-semibold text-rd-navy mb-4">Tu pedido</h2>
          <ul className="space-y-2 mb-4">
            {cart.map((item) => (
              <li key={item.id} className="flex justify-between text-xs text-slate-600">
                <span className="line-clamp-1 pr-2">
                  {routes[item.route].label} · {gradeLabel(item.grade)} · {coverages[item.coverage].label}
                </span>
                <span className="whitespace-nowrap font-semibold text-rd-navy">{formatMXN(item.priceMXN)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between text-base font-bold text-rd-navy border-t border-slate-200 pt-3">
            <span>Total</span>
            <span>{formatMXN(cartTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
