"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useStore } from "@/lib/store";

export default function IniciarSesionPage() {
  const { login } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(email);
    router.push("/biblioteca");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center mb-8">
        <Image src="/brand/logo.png" alt="Ruta Didáctica" width={160} height={54} className="h-10 w-auto mx-auto mb-6" />
        <h1 className="text-2xl font-extrabold text-rd-navy">Inicia sesión</h1>
        <p className="mt-1 text-sm text-slate-500">Accede a tus materiales y tu biblioteca.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-500 mb-1">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-rd-sm border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rd-sky focus:border-rd-sky"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-xs font-semibold text-slate-500">
              Contraseña
            </label>
            <Link href="/ayuda#soporte" className="text-xs font-semibold text-rd-violet hover:underline">
              ¿La olvidaste?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-rd-sm border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rd-sky focus:border-rd-sky"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-bold text-white hover:bg-rd-navy transition"
        >
          Iniciar sesión
        </button>
        <p className="text-[11px] text-slate-400 text-center">
          Demo funcional: cualquier correo y contraseña simulan el acceso.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/cuenta/registro" className="font-semibold text-rd-violet hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
