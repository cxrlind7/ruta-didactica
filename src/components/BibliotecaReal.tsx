"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { DocIcon, ImageIcon, ListIcon, TableIcon } from "@/components/icons";
import LoadingScreen from "@/components/LoadingScreen";

const PdfViewerModal = dynamic(() => import("@/components/PdfViewerModal"), { ssr: false });
const DocxViewerModal = dynamic(() => import("@/components/DocxViewerModal"), { ssr: false });
const XlsxViewerModal = dynamic(() => import("@/components/XlsxViewerModal"), { ssr: false });

type TipoKey = "planeacion" | "fichas" | "diapositiva" | "seguimiento";
type ArchivoOut = { archivoDriveId: string; label: string; nombreArchivo: string };
type TipoOut = { tipo: TipoKey; archivos: ArchivoOut[] };
type TrimestreOut = { trimestre: string; tipos: TipoOut[] };
type GradoOut = { grado: number; trimestres: TrimestreOut[] };

const TIPO_META: Record<TipoKey, { label: string; icon: typeof DocIcon }> = {
  planeacion: { label: "Planeaciones", icon: DocIcon },
  fichas: { label: "Fichas", icon: ListIcon },
  diapositiva: { label: "Diapositivas", icon: ImageIcon },
  seguimiento: { label: "Seguimiento", icon: TableIcon },
};

const TRIMESTRE_LABEL: Record<string, string> = {
  T1: "Trimestre 1",
  T2: "Trimestre 2",
  T3: "Trimestre 3",
  CA: "Cierre anual",
};

const GRADO_LABEL: Record<number, string> = { 1: "1º", 2: "2º", 3: "3º", 4: "4º", 5: "5º", 6: "6º" };

export default function BibliotecaReal() {
  const [grados, setGrados] = useState<GradoOut[] | null>(null);
  const [selectedTrimestre, setSelectedTrimestre] = useState<Record<number, string>>({});
  const [viewer, setViewer] = useState<{ kind: "pdf" | "docx" | "xlsx"; id: string } | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadAllError, setDownloadAllError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/biblioteca")
      .then((res) => (res.ok ? res.json() : { grados: [] }))
      .then((data: { grados: GradoOut[] }) => setGrados(data.grados))
      .catch(() => setGrados([]));
  }, []);

  // Armar el .zip toma tiempo del lado del servidor (lee, sella y comprime
  // cada archivo) antes de que empiece a llegar algo -- un <a download>
  // simple se queda sin dar ninguna señal durante ese rato y parece
  // trabado. Se pide por fetch para poder mostrar un estado de "generando"
  // mientras se espera, y recién al terminar se dispara la descarga real.
  async function handleDownloadAll() {
    setDownloadingAll(true);
    setDownloadAllError(null);
    try {
      const res = await fetch("/api/biblioteca/descargar-todo");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo generar la descarga.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Mi biblioteca - Ruta Didactica.zip";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadAllError(err instanceof Error ? err.message : "No se pudo generar la descarga.");
    } finally {
      setDownloadingAll(false);
    }
  }

  if (!grados) return <LoadingScreen label="Cargando tu biblioteca…" />;

  if (grados.length === 0) {
    return (
      <div className="mb-10 rounded-rd-md border border-dashed border-slate-300 p-12 text-center">
        <p className="text-rd-navy font-semibold">Todavía no tienes rutas adquiridas.</p>
        <Link
          href="/planes"
          className="mt-4 inline-flex rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white hover:bg-rd-navy"
        >
          Ver rutas y precios
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-10 space-y-6">
      <div className="flex flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={downloadingAll}
          className="inline-flex items-center gap-2 rounded-rd-md border border-rd-violet px-4 py-2 text-xs font-bold text-rd-violet hover:bg-rd-violet/10 disabled:cursor-wait disabled:opacity-60"
        >
          {downloadingAll && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rd-violet/30 border-t-rd-violet" aria-hidden />
          )}
          {downloadingAll ? "Generando tu .zip…" : "Descargar todo (.zip)"}
        </button>
        {downloadAllError && <p className="text-[11px] font-medium text-red-600">{downloadAllError}</p>}
      </div>
      {grados.map((g) => {
        const activeTrimestre = selectedTrimestre[g.grado] ?? g.trimestres[0]?.trimestre;
        const trimestreNode = g.trimestres.find((t) => t.trimestre === activeTrimestre);
        return (
          <section key={g.grado} className="rounded-rd-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-rd-navy">{GRADO_LABEL[g.grado]} grado</h2>
              <div className="flex gap-2">
                {g.trimestres.map((t) => (
                  <button
                    key={t.trimestre}
                    type="button"
                    onClick={() => setSelectedTrimestre((prev) => ({ ...prev, [g.grado]: t.trimestre }))}
                    className={`rounded-rd-sm border px-3 py-1 text-xs font-bold transition ${
                      t.trimestre === activeTrimestre
                        ? "border-rd-violet bg-rd-violet text-white"
                        : "border-slate-200 text-slate-500 hover:border-rd-sky"
                    }`}
                  >
                    {TRIMESTRE_LABEL[t.trimestre] ?? t.trimestre}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {trimestreNode?.tipos.map((tipo) => {
                const meta = TIPO_META[tipo.tipo];
                const Icon = meta.icon;
                const viewablePdf = tipo.tipo === "fichas" || tipo.tipo === "diapositiva";
                const viewableDocx = tipo.tipo === "planeacion";
                const viewableXlsx = tipo.tipo === "seguimiento";
                return (
                  <div key={tipo.tipo} className="rounded-rd-sm border border-slate-100">
                    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                      <Icon className="h-3.5 w-3.5 text-rd-violet" />
                      <p className="text-xs font-bold text-rd-navy">{meta.label}</p>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {tipo.archivos.map((a) => {
                        const ext = a.nombreArchivo.split(".").pop()?.toUpperCase() ?? "";
                        return (
                        <li key={a.archivoDriveId} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-rd-navy" title={a.nombreArchivo}>
                              {a.nombreArchivo}
                            </p>
                            <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                              {ext}
                            </span>
                          </div>
                          <span className="flex shrink-0 gap-1">
                            {viewablePdf && (
                              <button
                                type="button"
                                onClick={() => setViewer({ kind: "pdf", id: a.archivoDriveId })}
                                className="rounded-rd-sm bg-rd-violet px-2 py-1 font-semibold text-white hover:bg-rd-navy"
                              >
                                Ver
                              </button>
                            )}
                            {viewableDocx && (
                              <button
                                type="button"
                                onClick={() => setViewer({ kind: "docx", id: a.archivoDriveId })}
                                className="rounded-rd-sm bg-rd-violet px-2 py-1 font-semibold text-white hover:bg-rd-navy"
                              >
                                Ver
                              </button>
                            )}
                            {viewableXlsx && (
                              <button
                                type="button"
                                onClick={() => setViewer({ kind: "xlsx", id: a.archivoDriveId })}
                                className="rounded-rd-sm bg-rd-violet px-2 py-1 font-semibold text-white hover:bg-rd-navy"
                              >
                                Ver
                              </button>
                            )}
                            <a
                              href={`/api/archivos/${a.archivoDriveId}/descargar`}
                              download={a.nombreArchivo}
                              className="rounded-rd-sm border border-rd-violet px-2 py-1 font-semibold text-rd-violet hover:bg-rd-violet/10"
                            >
                              Descargar
                            </a>
                          </span>
                        </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {viewer?.kind === "pdf" && <PdfViewerModal archivoDriveId={viewer.id} onClose={() => setViewer(null)} />}
      {viewer?.kind === "docx" && <DocxViewerModal archivoDriveId={viewer.id} onClose={() => setViewer(null)} />}
      {viewer?.kind === "xlsx" && <XlsxViewerModal archivoDriveId={viewer.id} onClose={() => setViewer(null)} />}
    </div>
  );
}
