"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// Visor propio (no el visor nativo del navegador) para poder aplicar
// disuasion: bloquear clic derecho, Ctrl+P/Ctrl+S, y superponer el correo
// del usuario en cascada. Es disuasorio, no DRM real -- un usuario con
// suficiente esfuerzo (captura de pantalla, devtools) puede sortearlo.
export default function VisorPage() {
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { account: { email: string } | null }) => setEmail(data.account?.email ?? ""));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const res = await fetch(`/api/archivos/${id}/descargar`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setErrorMsg(data.error || "No se pudo abrir el archivo.");
          setStatus("error");
        }
        return;
      }

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();

      const buffer = await res.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      if (cancelled || !containerRef.current) return;

      containerRef.current.innerHTML = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = "block w-full h-auto rounded-rd-sm shadow-sm mb-4";
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (cancelled) return;
        containerRef.current.appendChild(canvas);
      }

      if (!cancelled) setStatus("ready");
    }

    render().catch(() => {
      if (!cancelled) {
        setErrorMsg("No se pudo mostrar el documento.");
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
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

  const overlayStyle = useMemo(() => {
    if (!email) return undefined;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="170"><text x="-10" y="100" font-size="13" fill="rgba(15,23,42,0.09)" font-family="sans-serif" transform="rotate(-28 140 85)">${email}</text></svg>`;
    return {
      backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`,
      backgroundRepeat: "repeat" as const,
    };
  }, [email]);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
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

      <div
        className="relative select-none"
        onContextMenu={(e) => e.preventDefault()}
        style={{ display: status === "ready" ? "block" : "none" }}
      >
        <div ref={containerRef} />
        <div className="pointer-events-none absolute inset-0" style={overlayStyle} aria-hidden />
      </div>
    </div>
  );
}
