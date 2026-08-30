"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { DocIcon, ImageIcon, ListIcon, TableIcon } from "@/components/icons";

const PdfViewerModal = dynamic(() => import("@/components/PdfViewerModal"), { ssr: false });

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
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/biblioteca")
      .then((res) => (res.ok ? res.json() : { grados: [] }))
      .then((data: { grados: GradoOut[] }) => setGrados(data.grados))
      .catch(() => setGrados([]));
  }, []);

  if (!grados) return null;

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
                const viewable = tipo.tipo === "fichas" || tipo.tipo === "diapositiva";
                return (
                  <div key={tipo.tipo} className="rounded-rd-sm border border-slate-100">
                    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                      <Icon className="h-3.5 w-3.5 text-rd-violet" />
                      <p className="text-xs font-bold text-rd-navy">{meta.label}</p>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {tipo.archivos.map((a) => (
                        <li key={a.archivoDriveId} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                          <span className="text-rd-navy">{a.label}</span>
                          {viewable ? (
                            <button
                              type="button"
                              onClick={() => setViewerId(a.archivoDriveId)}
                              className="rounded-rd-sm bg-rd-violet px-2 py-1 font-semibold text-white hover:bg-rd-navy"
                            >
                              Ver
                            </button>
                          ) : (
                            <a
                              href={`/api/archivos/${a.archivoDriveId}/descargar`}
                              className="rounded-rd-sm bg-rd-violet px-2 py-1 font-semibold text-white hover:bg-rd-navy"
                            >
                              Descargar
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {viewerId && <PdfViewerModal archivoDriveId={viewerId} onClose={() => setViewerId(null)} />}
    </div>
  );
}
