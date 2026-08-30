"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocIcon, ImageIcon, ListIcon, TableIcon, TrashIcon, UploadIcon } from "@/components/icons";

type ArchivoNode = {
  key: string;
  label: string;
  nombreArchivo: string;
  archivoDriveId: string;
  ingested: boolean;
  sizeBytes: number | null;
  ingestedAt: string | null;
};

type TipoKey = "planeacion" | "fichas" | "diapositiva" | "seguimiento";
type TipoNode = { tipo: TipoKey; archivos: ArchivoNode[] };
type GradoNode = { grado: number; tipos: TipoNode[] };

const TIPO_META: Record<TipoKey, { label: string; icon: typeof DocIcon; hint: string }> = {
  planeacion: { label: "Planeaciones", icon: DocIcon, hint: "Documentos editables (.docx)" },
  fichas: { label: "Fichas", icon: ListIcon, hint: "PDF para el docente" },
  diapositiva: { label: "Diapositivas", icon: ImageIcon, hint: "Apoyo visual en PDF" },
  seguimiento: { label: "Seguimiento", icon: TableIcon, hint: "Hojas de cálculo (.xlsx)" },
};

const GRADO_LABEL: Record<number, string> = { 1: "1º", 2: "2º", 3: "3º", 4: "4º", 5: "5º", 6: "6º" };

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function countIngested(tipos: TipoNode[]) {
  const total = tipos.reduce((sum, t) => sum + t.archivos.length, 0);
  const ingested = tipos.reduce((sum, t) => sum + t.archivos.filter((a) => a.ingested).length, 0);
  return { total, ingested };
}

type Account = { email: string; role: string } | null;

export default function AdminPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | "loading">("loading");
  const [grados, setGrados] = useState<GradoNode[] | null>(null);
  const [selectedGrado, setSelectedGrado] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback(() => {
    fetch("/api/admin/tree")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { grados: GradoNode[] }) => setGrados(data.grados))
      .catch(() => setError("No se pudo cargar el árbol de archivos."));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { account: Account }) => setAccount(data.account));
  }, []);

  useEffect(() => {
    if (account && account !== "loading" && account.role === "admin") loadTree();
  }, [account, loadTree]);

  const overall = useMemo(() => {
    if (!grados) return null;
    let total = 0;
    let ingested = 0;
    for (const g of grados) {
      const c = countIngested(g.tipos);
      total += c.total;
      ingested += c.ingested;
    }
    return { total, ingested, pct: total ? Math.round((ingested / total) * 100) : 0 };
  }, [grados]);

  async function handleUpload(archivoDriveId: string, file: File) {
    setBusyId(archivoDriveId);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/archivos/${archivoDriveId}/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      loadTree();
    } catch {
      setError("No se pudo subir el archivo. Intenta de nuevo.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(archivoDriveId: string) {
    setBusyId(archivoDriveId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/archivos/${archivoDriveId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      loadTree();
    } catch {
      setError("No se pudo retirar el archivo. Intenta de nuevo.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" }).catch(() => {});
    router.push("/");
  }

  if (account === "loading") return null;

  if (!account) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-rd-navy">Panel de administración</h1>
        <p className="mt-2 text-sm text-slate-500">Necesitas iniciar sesión con una cuenta de administrador.</p>
        <Link
          href="/cuenta/iniciar-sesion"
          className="mt-6 inline-flex rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white hover:bg-rd-navy transition"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (account.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-rd-navy">No autorizado</h1>
        <p className="mt-2 text-sm text-slate-500">La cuenta {account.email} no tiene permisos de administrador.</p>
      </div>
    );
  }

  const gradoActivo = grados?.find((g) => g.grado === selectedGrado);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rd-violet">Panel de administración</p>
          <h1 className="mt-1 text-2xl font-extrabold text-rd-navy">Archivos del catálogo</h1>
          <p className="mt-1 text-sm text-slate-500">Sube o retira materiales por grado, sin tocar código.</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-semibold text-slate-500 hover:text-rd-navy"
        >
          Cerrar sesión ({account.email})
        </button>
        {overall && (
          <div className="flex items-center gap-4 rounded-rd-md border border-slate-200 bg-slate-50 px-5 py-3">
            <Ring pct={overall.pct} />
            <div className="text-sm">
              <p className="font-bold text-rd-navy">
                {overall.ingested}/{overall.total}
              </p>
              <p className="text-xs text-slate-500">archivos subidos</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-rd-sm border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {grados === null ? (
        <p className="mt-10 text-sm text-slate-400">Cargando árbol de archivos…</p>
      ) : (
        <>
          <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
            {grados.map((g) => {
              const c = countIngested(g.tipos);
              const pct = c.total ? Math.round((c.ingested / c.total) * 100) : 0;
              const active = g.grado === selectedGrado;
              return (
                <button
                  key={g.grado}
                  type="button"
                  onClick={() => setSelectedGrado(g.grado)}
                  className={`flex shrink-0 items-center gap-2 rounded-rd-md border px-3 py-2 text-left transition ${
                    active
                      ? "border-rd-violet bg-rd-violet text-white"
                      : "border-slate-200 bg-white text-rd-navy hover:border-rd-sky"
                  }`}
                >
                  <Ring pct={pct} size={30} stroke={3.5} light={active} />
                  <span>
                    <span className="block text-sm font-bold">{GRADO_LABEL[g.grado]} grado</span>
                    <span className={`block text-[11px] ${active ? "text-white/80" : "text-slate-400"}`}>
                      {c.ingested}/{c.total}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {gradoActivo?.tipos.map((t) => (
              <TipoCard
                key={t.tipo}
                tipo={t}
                busyId={busyId}
                onUpload={handleUpload}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Ring({ pct, size = 40, stroke = 4, light = false }: { pct: number; size?: number; stroke?: number; light?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const trackColor = light ? "rgba(255,255,255,0.3)" : "#e2e8f0";
  const barColor = light ? "#ffffff" : "var(--rd-violet)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={barColor}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
    </svg>
  );
}

function TipoCard({
  tipo,
  busyId,
  onUpload,
  onDelete,
}: {
  tipo: TipoNode;
  busyId: string | null;
  onUpload: (id: string, file: File) => void;
  onDelete: (id: string) => void;
}) {
  const meta = TIPO_META[tipo.tipo];
  const Icon = meta.icon;
  const ingested = tipo.archivos.filter((a) => a.ingested).length;

  return (
    <section className="rounded-rd-md border border-slate-200 bg-white overflow-hidden">
      <header className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rd-violet/10 text-rd-violet">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-rd-navy">{meta.label}</p>
          <p className="text-[11px] text-slate-400">{meta.hint}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
          {ingested}/{tipo.archivos.length}
        </span>
      </header>

      {tipo.archivos.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-slate-400">Todavía no hay registros para este tipo.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
          {tipo.archivos.map((a) => (
            <ArchivoRow
              key={a.key}
              archivo={a}
              tipo={tipo.tipo}
              busy={busyId === a.archivoDriveId}
              onUpload={(file) => onUpload(a.archivoDriveId, file)}
              onDelete={() => onDelete(a.archivoDriveId)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ArchivoRow({
  archivo,
  tipo,
  busy,
  onUpload,
  onDelete,
}: {
  archivo: ArchivoNode;
  tipo: TipoKey;
  busy: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <li
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onUpload(file);
      }}
      className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs transition-colors ${
        dragOver ? "bg-rd-sky/10" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="font-semibold text-rd-navy">{archivo.label}</p>
        <p className="truncate font-mono text-[10.5px] text-slate-400" title={archivo.nombreArchivo}>
          {archivo.nombreArchivo}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {archivo.ingested ? (
          <>
            <span className="hidden text-slate-400 sm:inline">{formatSize(archivo.sizeBytes)}</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200">
              Subido
            </span>
            {tipo === "fichas" || tipo === "diapositiva" ? (
              <a
                href={`/visor/${archivo.archivoDriveId}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-rd-sm border border-slate-200 px-2 py-1.5 font-semibold text-rd-navy hover:border-rd-sky"
              >
                Ver
              </a>
            ) : (
              <a
                href={`/api/archivos/${archivo.archivoDriveId}/descargar`}
                className="rounded-rd-sm border border-slate-200 px-2 py-1.5 font-semibold text-rd-navy hover:border-rd-sky"
              >
                Descargar
              </a>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              aria-label={`Retirar ${archivo.nombreArchivo}`}
              className="rounded-rd-sm p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-40"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">Pendiente</span>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          aria-label={archivo.ingested ? "Reemplazar archivo" : "Subir archivo"}
          className="flex items-center gap-1 rounded-rd-sm bg-rd-violet px-2 py-1.5 font-semibold text-white hover:bg-rd-navy disabled:opacity-50"
        >
          <UploadIcon className="h-3.5 w-3.5" />
          {busy ? "…" : archivo.ingested ? "Reemplazar" : "Subir"}
        </button>
      </div>
    </li>
  );
}
