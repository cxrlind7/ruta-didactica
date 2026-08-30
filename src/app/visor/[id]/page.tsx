"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PDFViewer } from "@embedpdf/react-pdf-viewer";

// Visor propio (no el visor nativo del navegador), con permisos del propio
// PDFViewer bloqueando imprimir/copiar/exportar. Es disuasorio, no DRM real
// -- un usuario con suficiente esfuerzo puede sortearlo. La identificación
// real de a quién se le entregó el archivo vive en el sello del propio PDF
// (src/lib/pdfSeal.ts, pie de página en cada hoja), no en este visor.
export default function VisorPage() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      const res = await fetch(`/api/archivos/${id}/descargar`);
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
  }, [id]);

  useEffect(() => {
    function blockShortcuts(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === "p" || key === "s")) {
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", blockShortcuts);
    return () => window.removeEventListener("keydown", blockShortcuts);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/biblioteca" className="text-sm font-semibold text-rd-violet hover:underline">
          ← Volver a mi biblioteca
        </Link>
        <p className="text-xs text-slate-400">Uso individual · no se autoriza compartir este material.</p>
      </div>

      {status === "loading" && <p className="text-center text-sm text-slate-400 py-20">Cargando documento…</p>}

      {status === "error" && (
        <p className="rounded-rd-sm bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{errorMsg}</p>
      )}

      {status === "ready" && blobUrl && (
        <div
          className="overflow-hidden rounded-rd-md border border-slate-200"
          style={{ height: "80vh" }}
          onContextMenu={(e) => e.preventDefault()}
        >
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
        </div>
      )}
    </div>
  );
}
