"use client";

import { useEffect, useState } from "react";
import { PDFViewer } from "@embedpdf/react-pdf-viewer";
import { CloseIcon } from "@/components/icons";

// Modal en vez de una página aparte para que abrir un archivo se sienta
// instantáneo (sin navegación ni recarga del shell de la app). El bundle de
// @embedpdf se separa a un chunk propio -- ver el import dinámico en los
// lugares que usan este componente -- así no pesa en la carga inicial de
// biblioteca/admin, solo cuando alguien realmente abre un archivo.
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if (key === "escape") {
        onClose();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (key === "p" || key === "s")) e.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div
        className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-rd-md bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <p className="text-xs text-slate-400">Uso individual · no se autoriza compartir este material.</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-rd-sm p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rd-navy"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {status === "loading" && (
            <p className="py-20 text-center text-sm text-slate-400">Cargando documento…</p>
          )}
          {status === "error" && (
            <p className="m-4 rounded-rd-sm bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{errorMsg}</p>
          )}
          {status === "ready" && blobUrl && (
            <PDFViewer
              config={{
                src: blobUrl,
                theme: { preference: "light" },
                permissions: {
                  overrides: {
                    print: false,
                    printHighQuality: false,
                    copyContents: false,
                    modifyContents: false,
                    modifyAnnotations: false,
                    assembleDocument: false,
                  },
                },
                disabledCategories: [
                  "print",
                  "document-print",
                  "document-export",
                  "selection-copy",
                  "annotation",
                  "form",
                  "redaction",
                  "insert",
                  "history",
                ],
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
