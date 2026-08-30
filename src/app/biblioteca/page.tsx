"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import BibliotecaReal from "@/components/BibliotecaReal";

export default function BibliotecaPage() {
  const { account, isLoggedIn, hydrated } = useStore();

  if (hydrated && !isLoggedIn) {
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

      <BibliotecaReal />
    </div>
  );
}
