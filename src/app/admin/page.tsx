"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type ArchivoNode = {
  key: string;
  label: string;
  nombreArchivo: string;
  archivoDriveId: string;
  ingested: boolean;
  sizeBytes: number | null;
  ingestedAt: string | null;
};

type TipoNode = { tipo: "planeacion" | "fichas" | "diapositiva" | "seguimiento"; archivos: ArchivoNode[] };
type GradoNode = { grado: number; tipos: TipoNode[] };

const TIPO_LABEL: Record<TipoNode["tipo"], string> = {
  planeacion: "Planeaciones",
  fichas: "Fichas",
  diapositiva: "Diapositivas",
  seguimiento: "Seguimiento",
};

const GRADO_LABEL: Record<number, string> = {
  1: "1º",
  2: "2º",
  3: "3º",
  4: "4º",
  5: "5º",
  6: "6º",
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Account = { email: string; role: string } | null;

export default function AdminPage() {
  const [account, setAccount] = useState<Account | "loading">("loading");
  const [grados, setGrados] = useState<GradoNode[] | null>(null);
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

  if (account === "loading") return null;

  if (!account) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-rd-navy">Panel de administración</h1>
        <p className="mt-2 text-sm text-slate-500">Necesitas iniciar sesión con una cuenta de administrador.</p>
        <Link href="/cuenta/iniciar-sesion" className="mt-6 inline-flex rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (account.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-rd-navy">No autorizado</h1>
        <p className="mt-2 text-sm text-slate-500">Esta cuenta ({account.email}) no tiene permisos de administrador.</p>
      </div>
    );
  }

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
      setError("No se pudo subir el archivo.");
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
      setError("No se pudo borrar el archivo.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-extrabold text-rd-navy">Panel de administración · Archivos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Árbol por grado y tipo de recurso. Sube o borra archivos individuales sin tocar código.
      </p>
      {error && <p className="mt-4 rounded-rd-sm bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}

      <div className="mt-6 space-y-3">
        {grados === null && <p className="text-sm text-slate-400">Cargando…</p>}
        {grados?.map((g) => (
          <details key={g.grado} className="rounded-rd-md border border-slate-200 bg-white">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-rd-navy">
              {GRADO_LABEL[g.grado]} grado
            </summary>
            <div className="border-t border-slate-100 px-4 py-3 space-y-2">
              {g.tipos.map((t) => (
                <details key={t.tipo} className="rounded-rd-sm border border-slate-100">
                  <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-slate-600">
                    {TIPO_LABEL[t.tipo]} ({t.archivos.filter((a) => a.ingested).length}/{t.archivos.length})
                  </summary>
                  <ul className="divide-y divide-slate-100 border-t border-slate-100">
                    {t.archivos.map((a) => (
                      <ArchivoRow
                        key={a.key}
                        archivo={a}
                        busy={busyId === a.archivoDriveId}
                        onUpload={(file) => handleUpload(a.archivoDriveId, file)}
                        onDelete={() => handleDelete(a.archivoDriveId)}
                      />
                    ))}
                    {t.archivos.length === 0 && (
                      <li className="px-3 py-2 text-xs text-slate-400">Sin registros para este tipo.</li>
                    )}
                  </ul>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function ArchivoRow({
  archivo,
  busy,
  onUpload,
  onDelete,
}: {
  archivo: ArchivoNode;
  busy: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
      <div className="min-w-0">
        <p className="font-medium text-rd-navy">{archivo.label}</p>
        <p className="truncate text-slate-400" title={archivo.nombreArchivo}>
          {archivo.nombreArchivo}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {archivo.ingested ? (
          <>
            <span className="text-slate-400">{formatSize(archivo.sizeBytes)}</span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-700">Subido</span>
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className="rounded-rd-sm border border-red-200 px-2 py-1 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Borrar
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
          className="rounded-rd-sm bg-rd-violet px-2 py-1 font-semibold text-white hover:bg-rd-navy disabled:opacity-50"
        >
          {busy ? "…" : archivo.ingested ? "Reemplazar" : "Subir"}
        </button>
      </div>
    </li>
  );
}
