"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useStore, CartItem } from "@/lib/store";
import { coverages, gradeIcon, gradeLabel, routes } from "@/lib/data";

function downloadPlaceholder(item: CartItem) {
  const route = routes[item.route];
  const content = `Ruta Didáctica\n${route.label} · ${gradeLabel(item.grade)} · ${coverages[item.coverage].label}\n\nIncluye:\n${route.includes
    .map((i) => `- ${i}`)
    .join("\n")}\n\nEste es un archivo de demostración que representa el material descargable.\n`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${route.label.toLowerCase().replace(/\s+/g, "-")}-${item.grade}-${item.coverage}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BibliotecaPage() {
  const { library, account, isLoggedIn, hydrated } = useStore();
  const [entitledIds, setEntitledIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/library")
      .then((res) => res.json())
      .then((data: { entitlements: { itemId: string }[] }) => {
        setEntitledIds(new Set(data.entitlements.map((e) => e.itemId)));
      })
      .catch(() => {});
  }, []);

  function handleDownload(item: CartItem) {
    if (entitledIds.has(item.id)) {
      window.open(`/api/download/${item.id}`, "_self");
      return;
    }
    downloadPlaceholder(item);
  }

  if (hydrated && !isLoggedIn && library.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-rd-navy">Mi biblioteca</h1>
        <p className="mt-2 text-slate-500">
          Inicia sesión para ver tus rutas adquiridas y descargas.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/cuenta/iniciar-sesion"
            className="rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white hover:bg-rd-navy"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/planes"
            className="rounded-rd-md border border-slate-300 px-6 py-3 text-sm font-semibold text-rd-navy hover:border-rd-sky"
          >
            Ver rutas y precios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-rd-navy">Mi biblioteca</h1>
        <p className="mt-2 text-slate-500">
          {isLoggedIn ? `Hola, ${account?.name}. ` : ""}
          Aquí encuentras las rutas que has adquirido, listas para descargar.
        </p>
      </div>

      {library.length === 0 ? (
        <div className="rounded-rd-md border border-dashed border-slate-300 p-12 text-center">
          <p className="text-rd-navy font-semibold">Todavía no tienes rutas adquiridas.</p>
          <Link
            href="/planes"
            className="mt-4 inline-flex rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white hover:bg-rd-navy"
          >
            Ver rutas y precios
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 border-y border-slate-200">
          {library.map((item, i) => {
            const route = routes[item.route];
            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="flex flex-col sm:flex-row sm:items-center gap-4 py-5"
              >
                <Image
                  src={route.icon}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain rounded-rd-sm bg-slate-50 p-1"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-rd-navy">{route.label}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Image src={gradeIcon(item.grade)} alt="" width={14} height={14} className="h-3.5 w-3.5" />
                      {gradeLabel(item.grade)}
                    </span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-500">{coverages[item.coverage].label}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{route.includes.join(" · ")}</p>
                </div>
                <button
                  onClick={() => handleDownload(item)}
                  className="inline-flex items-center justify-center gap-2 rounded-rd-sm bg-fn-inicio px-4 py-2 text-xs font-bold text-rd-navy hover:brightness-95 transition"
                >
                  Descargar
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
