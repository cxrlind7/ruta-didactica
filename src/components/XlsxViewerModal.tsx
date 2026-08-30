"use client";

import { useEffect, useState } from "react";
import { loadXlsxWorkbook, renderSheetHtml, type XlsxWorkbook } from "@/lib/xlsxToHtml";
import ViewerModalShell from "@/components/ViewerModalShell";

// Igual que los otros visores pero para Seguimiento (.xlsx): vista previa
// simplificada como tabla HTML por hoja (ver src/lib/xlsxToHtml.ts), no una
// hoja de cálculo interactiva. Deliberadamente no usa el paquete "xlsx" de
// npm (CVEs sin parchar, evitado en toda esta sesión); se apoya solo en
// JSZip + DOMParser nativo.
export default function XlsxViewerModal({ archivoDriveId, onClose }: { archivoDriveId: string; onClose: () => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [workbook, setWorkbook] = useState<XlsxWorkbook | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [renderedSheet, setRenderedSheet] = useState<{ index: number; html: string } | null>(null);
  const sheetLoading = renderedSheet?.index !== sheetIndex;

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
      const wb = await loadXlsxWorkbook(buffer);
      if (cancelled) return;
      setWorkbook(wb);
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

  useEffect(() => {
    if (!workbook) return;
    let cancelled = false;
    renderSheetHtml(workbook, sheetIndex)
      .then((html) => {
        if (!cancelled) setRenderedSheet({ index: sheetIndex, html });
      })
      .catch(() => {
        if (!cancelled) setRenderedSheet({ index: sheetIndex, html: "<p>No se pudo mostrar esta hoja.</p>" });
      });
    return () => {
      cancelled = true;
    };
  }, [workbook, sheetIndex]);

  const sheetTabs =
    status === "ready" && workbook && workbook.sheets.length > 1 ? (
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50 px-3 py-2">
        {workbook.sheets.map((s, i) => (
          <button
            key={`${s.name}-${i}`}
            type="button"
            onClick={() => setSheetIndex(i)}
            className={`shrink-0 rounded-rd-sm border px-2.5 py-1 text-xs font-semibold transition ${
              i === sheetIndex
                ? "border-rd-violet bg-rd-violet text-white"
                : "border-slate-200 bg-white text-slate-500 hover:border-rd-sky"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    ) : undefined;

  return (
    <ViewerModalShell archivoDriveId={archivoDriveId} onClose={onClose} extraHeader={sheetTabs} maxWidthClassName="max-w-5xl">
      <div className="flex-1 select-none overflow-auto px-4 py-4">
        {status === "loading" && <p className="py-20 text-center text-sm text-slate-400">Cargando documento…</p>}
        {status === "error" && (
          <p className="rounded-rd-sm bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{errorMsg}</p>
        )}
        {status === "ready" && sheetLoading && (
          <p className="py-10 text-center text-sm text-slate-400">Cargando hoja…</p>
        )}
        {status === "ready" && !sheetLoading && renderedSheet && (
          <div className="rd-xlsx-preview-wrap" dangerouslySetInnerHTML={{ __html: renderedSheet.html }} />
        )}
      </div>
    </ViewerModalShell>
  );
}
