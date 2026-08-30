"use client";

import { useEffect, useRef, useState } from "react";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { formatMXN } from "@/lib/data";

// Igual que RealPaymentCheckout.tsx (los 3 productos de prueba) pero
// apuntando a /api/checkout -- el catálogo real (grado+ruta+cobertura+
// periodo). Se usa tanto en modo de pruebas como en producción (si se
// permite tarjeta), así que la public key no puede ser un env var NEXT_PUBLIC
// fijo en build time -- llega como prop (ver /api/settings) según el modo
// vigente, y solo se inicializa el SDK de Mercado Pago una vez que se sabe
// cuál usar.
let initializedPublicKey: string | null = null;

type Props = {
  grado: number;
  ruta: string;
  cobertura: string;
  periodoComprado: string;
  totalMXN: number;
  payerEmail: string;
  payerName: string;
  publicKey: string | null;
  onApproved: (orderId: string) => void;
};

type CardPaymentFormData = {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  installments: number;
  payer: { email?: string };
};

// El Brick no manda el tipo de tarjeta (credit_card/debit_card/prepaid_card)
// en formData -- viene en este segundo parámetro. Sin esto, se estaba
// mandando siempre "credit_card" a /api/checkout aunque la tarjeta real
// fuera de débito, lo que Mercado Pago rechaza (el token ya sabe qué tipo
// de tarjeta es realmente).
type CardPaymentAdditionalData = {
  paymentTypeId?: string;
};

type Phase = "form" | "confirming" | "error" | "rejected";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 10;

export default function RealCatalogCardCheckout({
  grado,
  ruta,
  cobertura,
  periodoComprado,
  totalMXN,
  payerEmail,
  payerName,
  publicKey,
  onApproved,
}: Props) {
  const [phase, setPhase] = useState<Phase>("form");
  const [message, setMessage] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  // El Brick de CardPayment (más abajo) espera que el SDK de Mercado Pago ya
  // esté inicializado con la public key correcta antes de montarse -- como
  // sus propios efectos internos corren antes que los de este componente
  // padre, un useEffect normal llegaría tarde. Se llama en el cuerpo del
  // componente (no en un efecto) porque es idempotente -- el guard evita
  // reinicializar si ya se hizo con la misma key -- igual que antes lo hacía
  // el código a nivel de módulo, solo que ahora la key llega por prop.
  if (publicKey && initializedPublicKey !== publicKey) {
    initMercadoPago(publicKey, { locale: "es-MX" });
    initializedPublicKey = publicKey;
  }
  const sdkReady = !!publicKey && initializedPublicKey === publicKey;

  function pollStatus(orderId: string, attempt: number) {
    fetch(`/api/orders/${orderId}/status`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("status_failed"))))
      .then((data: { status: string }) => {
        if (data.status === "approved") {
          onApproved(orderId);
          return;
        }
        if (data.status === "rejected" || data.status === "cancelled") {
          setPhase("rejected");
          setMessage("El pago no fue aprobado. Puedes intentar con otra tarjeta de prueba.");
          return;
        }
        if (attempt >= MAX_POLLS) {
          setMessage("Seguimos esperando la confirmación de Mercado Pago. Revisa 'Mi biblioteca' en unos minutos.");
          return;
        }
        pollTimer.current = setTimeout(() => pollStatus(orderId, attempt + 1), POLL_INTERVAL_MS);
      })
      .catch(() => {
        setMessage("No se pudo confirmar el estado del pago. Revisa 'Mi biblioteca' en unos minutos.");
      });
  }

  async function handleSubmit(formData: CardPaymentFormData, additionalData?: CardPaymentAdditionalData) {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grado,
        ruta,
        cobertura,
        periodoComprado,
        payerEmail,
        payerName,
        formData: {
          token: formData.token,
          payment_method_id: formData.payment_method_id,
          installments: formData.installments,
          payment_type: additionalData?.paymentTypeId || "credit_card",
        },
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setPhase("error");
      setMessage(data.error || "No se pudo procesar el pago de prueba.");
      throw new Error(data.error || "orden_fallida");
    }

    setPhase("confirming");
    setMessage("Confirmando el pago con Mercado Pago…");
    pollStatus(data.orderId, 1);
  }

  if (phase === "confirming") {
    return (
      <div className="rounded-rd-md border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm font-semibold text-rd-navy">{message}</p>
        <p className="mt-1 text-xs text-slate-400">No cierres esta pestaña.</p>
      </div>
    );
  }

  if (!sdkReady) {
    return <p className="text-xs text-slate-400">Cargando formulario de pago…</p>;
  }

  return (
    <div className="space-y-3">
      {message && phase !== "form" && (
        <p className="rounded-rd-sm bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{message}</p>
      )}
      <p className="text-xs text-slate-400">Total {formatMXN(totalMXN)}</p>
      <CardPayment
        initialization={{ amount: totalMXN, payer: { email: payerEmail || undefined } }}
        onSubmit={handleSubmit}
        onError={(err) => {
          setPhase("error");
          setMessage(err?.message || "Ocurrió un error con el formulario de pago.");
        }}
      />
    </div>
  );
}
