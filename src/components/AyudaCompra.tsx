import { WHATSAPP_NUMERO, WHATSAPP_URL } from "@/lib/contacto";

// Aviso de soporte en los momentos donde suelen surgir dudas de compra
// (checkout y confirmación).
export default function AyudaCompra({ className = "" }: { className?: string }) {
  return (
    <p className={`rounded-rd-sm border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 ${className}`}>
      Si necesitas ayuda con tu compra o tienes un problema, escríbenos por WhatsApp al{" "}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        className="whitespace-nowrap font-bold text-rd-violet hover:underline"
      >
        {WHATSAPP_NUMERO}
      </a>
      .
    </p>
  );
}
