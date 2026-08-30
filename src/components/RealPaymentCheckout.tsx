"use client";

import { useEffect, useRef, useState } from "react";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { formatMXN } from "@/lib/data";

let mpInitialized = false;

type Props = {
  itemIds: string[];
  totalMXN: number;
  payerEmail: string;
  payerName: string;
  onApproved: (orderId: string) => void;
};

type CardPaymentFormData = {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  installments: number;
  payer: { email?: string };
};

type Phase = "form" | "confirming" | "error" | "rejected";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 10;

export default function RealPaymentCheckout({ itemIds, totalMXN, payerEmail, payerName, onApproved }: Props) {
  const [phase, setPhase] = useState<Phase>("form");
  const [message, setMessage] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    if (publicKey && !mpInitialized) {
      initMercadoPago(publicKey, { locale: "es-MX" });
      mpInitialized = true;
    }
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

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
          setMessage(
            "Seguimos esperando la confirmación de Mercado Pago. Revisa 'Mi biblioteca' en unos minutos."
          );
          return;
        }
        pollTimer.current = setTimeout(() => pollStatus(orderId, attempt + 1), POLL_INTERVAL_MS);
      })
      .catch(() => {
        setMessage("No se pudo confirmar el estado del pago. Revisa 'Mi biblioteca' en unos minutos.");
      });
  }

  async function handleSubmit(formData: CardPaymentFormData) {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemIds,
        payerEmail,
        payerName,
        formData: {
          token: formData.token,
          issuer_id: formData.issuer_id,
          payment_method_id: formData.payment_method_id,
          installments: formData.installments,
          payment_type: "credit_card",
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

  return (
    <div className="space-y-3">
      {message && phase !== "form" && (
        <p className="rounded-rd-sm bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{message}</p>
      )}
      <p className="text-xs text-slate-400">
        Pago de prueba con Mercado Pago · Total {formatMXN(totalMXN)} · usa una tarjeta de prueba de tu cuenta
        vendedora.
      </p>
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
