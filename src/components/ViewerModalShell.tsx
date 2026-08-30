"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CloseIcon } from "@/components/icons";

// Trae el mismo texto de trazabilidad que ya se sella en el pie de página
// del archivo real (src/lib/officeSeal.ts / pdfSeal.ts), pero sin descargar
// el archivo completo -- solo para mostrarlo en la barra superior del
// visor, ya que mammoth y la vista previa de xlsx no renderizan pies de
// página/encabezados reales.
export function useViewerStamp(archivoDriveId: string): string | null {
  const [stamp, setStamp] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/archivos/${archivoDriveId}/sello`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stamp: string } | null) => {
        if (!cancelled && data) setStamp(data.stamp);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [archivoDriveId]);

  return stamp;
}

export default function ViewerModalShell({
  archivoDriveId,
  onClose,
  children,
  extraHeader,
  maxWidthClassName = "max-w-4xl",
}: {
  archivoDriveId: string;
  onClose: () => void;
  children: ReactNode;
  extraHeader?: ReactNode;
  maxWidthClassName?: string;
}) {
  const stamp = useViewerStamp(archivoDriveId);

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
        className={`flex h-[90vh] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-rd-md bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
          <p className="truncate text-xs text-slate-400">
            {stamp ?? "Uso individual · no se autoriza compartir este material."}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-rd-sm p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rd-navy"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        {extraHeader}
        {children}
      </div>
    </div>
  );
}
