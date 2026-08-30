"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useStore } from "@/lib/store";

export default function RegistroPage() {
  const { login } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(email, name);
    router.push("/biblioteca");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center mb-8">
        <Image src="/brand/logo.png" alt="Ruta Didáctica" width={160} height={54} className="h-10 w-auto mx-auto mb-6" />
        <h1 className="text-2xl font-extrabold text-rd-navy">Crea tu cuenta docente</h1>
        <p className="mt-1 text-sm text-slate-500">Regístrate para comprar y guardar tus materiales.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-slate-500 mb-1">
            Nombre completo
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-rd-sm border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rd-sky focus:border-rd-sky"
          />
        </div>
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
          <label htmlFor="password" className="block text-xs font-semibold text-slate-500 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-rd-sm border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rd-sky focus:border-rd-sky"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-bold text-white hover:bg-rd-navy transition"
        >
          Registrarme
        </button>
        <p className="text-[11px] text-slate-400 text-center">
          Demo funcional: los datos se guardan solo en tu navegador, sin envío a ningún servidor.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/cuenta/iniciar-sesion" className="font-semibold text-rd-violet hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
