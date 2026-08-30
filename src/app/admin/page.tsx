"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRightIcon, DocIcon, EditIcon, ImageIcon, ListIcon, PlusIcon, TableIcon, TrashIcon, UploadIcon } from "@/components/icons";

type ArchivoNode = {
  key: string;
  label: string;
  nombreArchivo: string;
  archivoDriveId: string;
  ingested: boolean;
  sizeBytes: number | null;
  ingestedAt: string | null;
  manual: boolean;
};

type ActionResult = { ok: true } | { ok: false; error: string };

type TipoKey = "planeacion" | "fichas" | "diapositiva" | "seguimiento";
type TipoNode = { tipo: TipoKey; archivos: ArchivoNode[] };
type TrimestreNode = { trimestre: string; tipos: TipoNode[] };
type GradoNode = { grado: number; trimestres: TrimestreNode[] };

const TIPO_META: Record<TipoKey, { label: string; icon: typeof DocIcon; hint: string }> = {
  planeacion: { label: "Planeaciones", icon: DocIcon, hint: "Documentos editables (.docx)" },
  fichas: { label: "Fichas", icon: ListIcon, hint: "PDF para el docente" },
  diapositiva: { label: "Diapositivas", icon: ImageIcon, hint: "Apoyo visual en PDF" },
  seguimiento: { label: "Seguimiento", icon: TableIcon, hint: "Hojas de cálculo (.xlsx)" },
};

const GRADO_LABEL: Record<number, string> = { 1: "1º", 2: "2º", 3: "3º", 4: "4º", 5: "5º", 6: "6º" };
const TRIMESTRE_LABEL: Record<string, string> = { T1: "Trimestre 1", T2: "Trimestre 2", T3: "Trimestre 3", CA: "Cierre anual" };

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

function countIngestedGrado(trimestres: TrimestreNode[]) {
  return trimestres.reduce(
    (acc, t) => {
      const c = countIngested(t.tipos);
      return { total: acc.total + c.total, ingested: acc.ingested + c.ingested };
    },
    { total: 0, ingested: 0 }
  );
}

type Account = { email: string; role: string } | null;

export default function AdminPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | "loading">("loading");
  const [grados, setGrados] = useState<GradoNode[] | null>(null);
  const [selectedGrado, setSelectedGrado] = useState(1);
  const [selectedTrimestre, setSelectedTrimestre] = useState<string | null>(null);
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
      const c = countIngestedGrado(g.trimestres);
      total += c.total;
      ingested += c.ingested;
    }
    return { total, ingested, pct: total ? Math.round((ingested / total) * 100) : 0 };
  }, [grados]);

  const gradoActivo = grados?.find((g) => g.grado === selectedGrado);

  const trimestreEfectivo =
    gradoActivo && gradoActivo.trimestres.some((t) => t.trimestre === selectedTrimestre)
      ? selectedTrimestre
      : (gradoActivo?.trimestres[0]?.trimestre ?? null);
  const trimestreActivo = gradoActivo?.trimestres.find((t) => t.trimestre === trimestreEfectivo);

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

  async function handleEditArchivo(
    archivoDriveId: string,
    data: { label?: string; nombreArchivo?: string }
  ): Promise<ActionResult> {
    try {
      const res = await fetch(`/api/admin/archivos/${archivoDriveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return { ok: false, error: body?.error ?? "No se pudo guardar." };
      }
      loadTree();
      return { ok: true };
    } catch {
      return { ok: false, error: "No se pudo guardar." };
    }
  }

  async function handleCreateArchivo(data: {
    tipo: TipoKey;
    grado: number;
    trimestre: string;
    label: string;
    nombreArchivo: string;
  }): Promise<ActionResult> {
    try {
      const res = await fetch("/api/admin/archivos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return { ok: false, error: body?.error ?? "No se pudo crear el recurso." };
      }
      loadTree();
      return { ok: true };
    } catch {
      return { ok: false, error: "No se pudo crear el recurso." };
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
              const c = countIngestedGrado(g.trimestres);
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

          {gradoActivo && gradoActivo.trimestres.length > 0 && (
            <div className="mt-6 flex gap-2">
              {gradoActivo.trimestres.map((t) => {
                const c = countIngested(t.tipos);
                const active = t.trimestre === trimestreEfectivo;
                return (
                  <button
                    key={t.trimestre}
                    type="button"
                    onClick={() => setSelectedTrimestre(t.trimestre)}
                    className={`rounded-rd-sm border px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? "border-rd-navy bg-rd-navy text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-rd-sky"
                    }`}
                  >
                    {TRIMESTRE_LABEL[t.trimestre] ?? t.trimestre}
                    <span className={active ? "ml-1.5 text-white/70" : "ml-1.5 text-slate-400"}>
                      {c.ingested}/{c.total}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {trimestreActivo?.tipos.map((t) => (
              <TipoCard
                key={t.tipo}
                tipo={t}
                grado={selectedGrado}
                trimestre={trimestreActivo.trimestre}
                busyId={busyId}
                onUpload={handleUpload}
                onDelete={handleDelete}
                onEdit={handleEditArchivo}
                onCreate={handleCreateArchivo}
              />
            ))}
            {gradoActivo && gradoActivo.trimestres.length === 0 && (
              <p className="text-sm text-slate-400">Todavía no hay contenido cargado para este grado.</p>
            )}
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
  grado,
  trimestre,
  busyId,
  onUpload,
  onDelete,
  onEdit,
  onCreate,
}: {
  tipo: TipoNode;
  grado: number;
  trimestre: string;
  busyId: string | null;
  onUpload: (id: string, file: File) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, data: { label?: string; nombreArchivo?: string }) => Promise<ActionResult>;
  onCreate: (data: { tipo: TipoKey; grado: number; trimestre: string; label: string; nombreArchivo: string }) => Promise<ActionResult>;
}) {
  const meta = TIPO_META[tipo.tipo];
  const Icon = meta.icon;
  const ingested = tipo.archivos.filter((a) => a.ingested).length;
  const [adding, setAdding] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

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
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          title="Agregar archivo"
          aria-label="Agregar archivo"
          className={`shrink-0 rounded-full p-1.5 transition ${
            adding ? "bg-rd-violet text-white" : "text-rd-violet hover:bg-rd-violet/10"
          }`}
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </button>
      </header>

      {adding && (
        <AgregarArchivoForm
          tipo={tipo.tipo}
          grado={grado}
          trimestre={trimestre}
          onCreate={onCreate}
          onDone={() => setAdding(false)}
        />
      )}

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
              expanded={expandedKey === a.key}
              onToggle={() => setExpandedKey((k) => (k === a.key ? null : a.key))}
              onUpload={(file) => onUpload(a.archivoDriveId, file)}
              onDelete={() => onDelete(a.archivoDriveId)}
              onEdit={(data) => onEdit(a.archivoDriveId, data)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function AgregarArchivoForm({
  tipo,
  grado,
  trimestre,
  onCreate,
  onDone,
}: {
  tipo: TipoKey;
  grado: number;
  trimestre: string;
  onCreate: (data: { tipo: TipoKey; grado: number; trimestre: string; label: string; nombreArchivo: string }) => Promise<ActionResult>;
  onDone: () => void;
}) {
  const [label, setLabel] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setFormError(null);
    const result = await onCreate({ tipo, grado, trimestre, label: label.trim(), nombreArchivo: nombreArchivo.trim() });
    setSaving(false);
    if (result.ok) onDone();
    else setFormError(result.error);
  }

  return (
    <div className="space-y-2 border-b border-slate-100 bg-rd-violet/5 px-4 py-3">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Nombre del recurso (ej. Quincena 06)"
        className="w-full rounded-rd-sm border border-slate-200 px-2 py-1.5 text-xs focus:border-rd-violet focus:outline-none"
      />
      <input
        type="text"
        value={nombreArchivo}
        onChange={(e) => setNombreArchivo(e.target.value)}
        placeholder="Nombre del archivo (como se guardará)"
        className="w-full rounded-rd-sm border border-slate-200 px-2 py-1.5 font-mono text-[11px] focus:border-rd-violet focus:outline-none"
      />
      {formError && <p className="text-[11px] font-medium text-red-600">{formError}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving || !label.trim() || !nombreArchivo.trim()}
          onClick={submit}
          className="rounded-rd-sm bg-rd-violet px-3 py-1.5 text-xs font-semibold text-white hover:bg-rd-navy disabled:opacity-40"
        >
          {saving ? "Agregando…" : "Agregar"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-rd-sm px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rd-navy"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ArchivoRow({
  archivo,
  tipo,
  busy,
  expanded,
  onToggle,
  onUpload,
  onDelete,
  onEdit,
}: {
  archivo: ArchivoNode;
  tipo: TipoKey;
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  onUpload: (file: File) => void;
  onDelete: () => void;
  onEdit: (data: { label?: string; nombreArchivo?: string }) => Promise<ActionResult>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(archivo.label);
  const [nombreArchivo, setNombreArchivo] = useState(archivo.nombreArchivo);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function handleHeaderClick() {
    setEditing(false);
    onToggle();
  }

  function startEditing() {
    setLabel(archivo.label);
    setNombreArchivo(archivo.nombreArchivo);
    setFormError(null);
    setEditing(true);
  }

  async function submitEdit() {
    setSaving(true);
    setFormError(null);
    const result = await onEdit({ label: label.trim(), nombreArchivo: nombreArchivo.trim() });
    setSaving(false);
    if (result.ok) setEditing(false);
    else setFormError(result.error);
  }

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
      className={`text-xs transition-colors ${dragOver ? "bg-rd-sky/10" : ""}`}
    >
      <button
        type="button"
        onClick={handleHeaderClick}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
      >
        <ChevronRightIcon
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-rd-navy">{archivo.label}</p>
          <p className="truncate font-mono text-[10.5px] text-slate-400" title={archivo.nombreArchivo}>
            {archivo.nombreArchivo}
          </p>
        </div>
        {archivo.ingested ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200">
            Subido
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">Pendiente</span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Nombre del recurso"
                className="w-full rounded-rd-sm border border-slate-200 px-2 py-1.5 text-xs focus:border-rd-violet focus:outline-none"
              />
              <input
                type="text"
                value={nombreArchivo}
                onChange={(e) => setNombreArchivo(e.target.value)}
                placeholder="Nombre del archivo"
                className="w-full rounded-rd-sm border border-slate-200 px-2 py-1.5 font-mono text-[10.5px] focus:border-rd-violet focus:outline-none"
              />
              {formError && <p className="text-[11px] font-medium text-red-600">{formError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving || !label.trim() || !nombreArchivo.trim()}
                  onClick={submitEdit}
                  className="rounded-rd-sm bg-rd-violet px-3 py-1.5 text-xs font-semibold text-white hover:bg-rd-navy disabled:opacity-40"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-rd-sm px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rd-navy"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {archivo.ingested && (
                <span className="text-slate-400">{formatSize(archivo.sizeBytes)}</span>
              )}
              {archivo.archivoDriveId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={startEditing}
                  className="flex items-center gap-1 rounded-rd-sm border border-slate-200 px-2 py-1.5 font-semibold text-rd-navy hover:border-rd-sky disabled:opacity-40"
                >
                  <EditIcon className="h-3.5 w-3.5" />
                  Editar
                </button>
              )}
              {archivo.ingested &&
                (tipo === "fichas" || tipo === "diapositiva" ? (
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
                ))}
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
                className="flex items-center gap-1 rounded-rd-sm bg-rd-violet px-2 py-1.5 font-semibold text-white hover:bg-rd-navy disabled:opacity-50"
              >
                <UploadIcon className="h-3.5 w-3.5" />
                {busy ? "…" : archivo.ingested ? "Reemplazar" : "Subir"}
              </button>
              {archivo.archivoDriveId && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onDelete}
                  className="flex items-center gap-1 rounded-rd-sm p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-40"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  {archivo.manual ? "Eliminar recurso" : "Retirar archivo"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
