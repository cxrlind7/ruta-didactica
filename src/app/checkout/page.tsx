"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { formatMXN, gradeLabel, routes, RUTA_CODE } from "@/lib/data";
import RealCatalogCardCheckout from "@/components/RealCatalogCardCheckout";
import LegalCheckbox from "@/components/LegalCheckbox";

// Los enlaces fijos de Mercado Pago (modo producción) cobran una sola
// combinación cobertura+modalidad por pago -- no se puede pagar varios
// artículos del carrito de un jalón. Por eso el checkout procesa un
// artículo a la vez: si hay varios en el carrito, el comprador elige cuál
// paga ahora y vuelve por el siguiente.
export default function CheckoutPage() {
  const { cart, removeFromCart, completeOrder, account, isLoggedIn, setAccountLocal } = useStore();
  const router = useRouter();

  const [activeId, setActiveId] = useState<string | null>(null);
  // El store hidrata `account` desde localStorage un instante despues del
  // primer render -- si guardaramos el email/nombre en useState al montar,
  // se quedarian vacios cuando se entra directo a /checkout (recarga, link
  // externo) en vez de navegar desde el carrito. Mientras el campo no se
  // haya tocado a mano, se deriva siempre de `account`.
  const [emailDraft, setEmailDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const email = emailTouched ? emailDraft : (account?.email ?? "");
  const name = nameTouched ? nameDraft : (account?.name ?? "");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [modoPago, setModoPago] = useState<"prueba" | "produccion" | null>(null);
  const [permitirTarjeta, setPermitirTarjeta] = useState(false);
  const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
  const [payWith, setPayWith] = useState<"enlace" | "tarjeta">("enlace");
  const [linkPurchasing, setLinkPurchasing] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: { modoPago: string; permitirTarjetaProduccion: boolean; mpPublicKey: string | null }) => {
        setModoPago(d.modoPago === "produccion" ? "produccion" : "prueba");
        setPermitirTarjeta(!!d.permitirTarjetaProduccion);
        setMpPublicKey(d.mpPublicKey);
      })
      .catch(() => setModoPago("prueba"));
  }, []);

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

  const item = cart.find((i) => i.id === activeId) ?? cart[0];
  const canPay = !!name.trim() && !!email.includes("@") && legalAccepted;

  function handleApproved() {
    setAccountLocal(email.trim(), name.trim());
    completeOrder([item]);
    router.push("/confirmacion");
  }

  async function handleBuyLink() {
    setLinkPurchasing(true);
    setLinkError(null);
    try {
      const res = await fetch("/api/checkout/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grado: item.grade,
          ruta: RUTA_CODE[item.route],
          cobertura: item.coverage,
          periodoComprado: item.periodoComprado,
          payerEmail: email,
          payerName: name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinkError(data.error || "No se pudo iniciar el pago.");
        return;
      }
      setAccountLocal(email.trim(), name.trim());
      removeFromCart(item.id);
      window.location.href = data.paymentUrl;
    } catch {
      setLinkError("No se pudo iniciar el pago.");
    } finally {
      setLinkPurchasing(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-extrabold text-rd-navy mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_320px] gap-10">
        <div className="space-y-6">
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
                onChange={(e) => {
                  setNameTouched(true);
                  setNameDraft(e.target.value);
                }}
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
                onChange={(e) => {
                  setEmailTouched(true);
                  setEmailDraft(e.target.value);
                }}
                className="w-full rounded-rd-sm border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rd-sky focus:border-rd-sky"
                placeholder="tu@correo.com"
              />
              {!isLoggedIn && (
                <p className="mt-1 text-xs text-slate-400">Con esta compra crearemos u ocuparemos tu cuenta de Ruta Didáctica.</p>
              )}
            </div>
          </fieldset>

          <LegalCheckbox checked={legalAccepted} onChange={setLegalAccepted} />

          {!canPay ? (
            <p className="text-xs text-slate-400">Completa tu nombre, correo y acepta los términos para continuar al pago.</p>
          ) : modoPago === "produccion" ? (
            <div className="space-y-3">
              {permitirTarjeta && (
                <div className="inline-flex rounded-rd-md border border-slate-200 p-1">
                  <button
                    type="button"
                    onClick={() => setPayWith("enlace")}
                    className={`rounded-rd-sm px-4 py-1.5 text-xs font-bold transition ${
                      payWith === "enlace" ? "bg-rd-navy text-white" : "text-slate-500 hover:text-rd-navy"
                    }`}
                  >
                    Link de pago
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayWith("tarjeta")}
                    className={`rounded-rd-sm px-4 py-1.5 text-xs font-bold transition ${
                      payWith === "tarjeta" ? "bg-rd-navy text-white" : "text-slate-500 hover:text-rd-navy"
                    }`}
                  >
                    Tarjeta
                  </button>
                </div>
              )}

              {payWith === "tarjeta" && permitirTarjeta ? (
                <fieldset className="space-y-3">
                  <legend className="text-sm font-semibold text-rd-navy mb-1">Pago con tarjeta</legend>
                  <RealCatalogCardCheckout
                    grado={item.grade}
                    ruta={RUTA_CODE[item.route]}
                    cobertura={item.coverage}
                    periodoComprado={item.periodoComprado}
                    totalMXN={item.priceMXN}
                    payerEmail={email}
                    payerName={name}
                    publicKey={mpPublicKey}
                    onApproved={handleApproved}
                  />
                </fieldset>
              ) : (
                <>
                  {linkError && (
                    <p className="rounded-rd-sm bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{linkError}</p>
                  )}
                  <button
                    type="button"
                    disabled={linkPurchasing}
                    onClick={handleBuyLink}
                    className="w-full rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-bold text-white hover:bg-rd-navy transition disabled:opacity-60"
                  >
                    {linkPurchasing ? "Redirigiendo…" : `Pagar ${formatMXN(item.priceMXN)} con Mercado Pago`}
                  </button>
                </>
              )}
            </div>
          ) : modoPago === "prueba" ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-rd-navy mb-1">Pago con tarjeta de prueba</legend>
              <RealCatalogCardCheckout
                grado={item.grade}
                ruta={RUTA_CODE[item.route]}
                cobertura={item.coverage}
                periodoComprado={item.periodoComprado}
                totalMXN={item.priceMXN}
                payerEmail={email}
                payerName={name}
                publicKey={mpPublicKey}
                onApproved={handleApproved}
              />
            </fieldset>
          ) : (
            <p className="text-xs text-slate-400">Cargando forma de pago…</p>
          )}
        </div>

        <div className="h-fit rounded-rd-lg border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-sm font-semibold text-rd-navy mb-4">Tu pedido</h2>
          {cart.length > 1 && (
            <p className="mb-3 text-[11px] text-slate-400">
              Los pagos se procesan de uno en uno. Elige cuál pagas ahora; los demás quedan en tu carrito.
            </p>
          )}
          <ul className="space-y-2 mb-4">
            {cart.map((cartItem) => (
              <li key={cartItem.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(cartItem.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-rd-sm border px-2.5 py-2 text-left text-xs transition ${
                    cartItem.id === item.id ? "border-rd-violet bg-rd-violet/5" : "border-transparent hover:border-slate-200"
                  }`}
                >
                  <span className="line-clamp-1 pr-2 text-slate-600">
                    {routes[cartItem.route].label} · {gradeLabel(cartItem.grade)} · {cartItem.periodoLabel}
                  </span>
                  <span className="whitespace-nowrap font-semibold text-rd-navy">{formatMXN(cartItem.priceMXN)}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-between text-base font-bold text-rd-navy border-t border-slate-200 pt-3">
            <span>Pagando ahora</span>
            <span>{formatMXN(item.priceMXN)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
