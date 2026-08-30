"use client";

import { useEffect, useState } from "react";
import ViewerModalShell from "@/components/ViewerModalShell";

// Modal en vez de una página aparte para que abrir un archivo se sienta
// instantáneo (sin navegación ni recarga del shell de la app). Usa el
// visor nativo de PDF del navegador (via <iframe>) en vez de un motor de
// terceros: carga al instante y no depende de descargar un engine WASM
// (probamos @embedpdf/react-pdf-viewer y resultó lento/poco confiable).
// Es disuasorio (bloqueo de Ctrl+P/Ctrl+S y clic derecho del contenedor),
// no DRM real -- el propio visor nativo del navegador conserva sus
// botones de imprimir/descargar, que no se pueden ocultar desde aquí.
export default function PdfViewerModal({ archivoDriveId, onClose }: { archivoDriveId: string; onClose: () => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

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
      const blob = await res.blob();
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
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
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [archivoDriveId]);

  return (
    <ViewerModalShell archivoDriveId={archivoDriveId} onClose={onClose}>
      <div className="relative flex-1 overflow-hidden">
        {status === "loading" && <p className="py-20 text-center text-sm text-slate-400">Cargando documento…</p>}
        {status === "error" && (
          <p className="m-4 rounded-rd-sm bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{errorMsg}</p>
        )}
        {status === "ready" && blobUrl && (
          <iframe src={blobUrl} title="Documento" className="h-full w-full border-0" />
        )}
      </div>
    </ViewerModalShell>
  );
}
