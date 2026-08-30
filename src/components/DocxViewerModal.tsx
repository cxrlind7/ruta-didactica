"use client";

import { useEffect, useState } from "react";
import mammoth from "mammoth";
import ViewerModalShell from "@/components/ViewerModalShell";

const CONTENT_CLASS =
  "max-w-none text-sm leading-relaxed text-slate-700 " +
  "[&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-rd-navy " +
  "[&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-rd-navy " +
  "[&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-rd-navy " +
  "[&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse " +
  "[&_td]:border [&_td]:border-slate-200 [&_td]:p-1.5 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-1.5 " +
  "[&_img]:max-w-full [&_strong]:font-semibold";

// Igual que PdfViewerModal pero para Planeacion (.docx): se convierte a HTML
// con mammoth en el navegador (nunca sale del cliente) en vez de mostrar el
// visor nativo de Word/descarga directa. Disuasorio, no DRM real.
export default function DocxViewerModal({ archivoDriveId, onClose }: { archivoDriveId: string; onClose: () => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch(`/api/archivos/${archivoDriveId}/descargar`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setErrorMsg(data.error || "No se pudo abrir el archivo.");
          setStatus("error");
        }
        return;
      }
      const buffer = await res.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      if (cancelled) return;
      setHtml(result.value);
      setStatus("ready");
    }

    load().catch(() => {
      if (!cancelled) {
        setErrorMsg("No se pudo mostrar el documento.");
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [archivoDriveId]);

  return (
    <ViewerModalShell archivoDriveId={archivoDriveId} onClose={onClose} maxWidthClassName="max-w-3xl">
      <div className="flex-1 select-none overflow-y-auto px-8 py-6">
        {status === "loading" && <p className="py-20 text-center text-sm text-slate-400">Cargando documento…</p>}
        {status === "error" && (
          <p className="rounded-rd-sm bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{errorMsg}</p>
        )}
        {status === "ready" && <div className={CONTENT_CLASS} dangerouslySetInnerHTML={{ __html: html }} />}
      </div>
    </ViewerModalShell>
  );
}
