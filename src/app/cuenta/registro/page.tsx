"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useStore } from "@/lib/store";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <RegistroForm />
    </Suspense>
  );
}

function RegistroForm() {
  const { setAccountLocal } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear la cuenta");
        return;
      }
      setAccountLocal(data.email, data.name);
      router.push("/biblioteca");
    } catch {
      setError("No se pudo crear la cuenta. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center mb-8">
        <Image src="/brand/logo.png" alt="Ruta Didáctica" width={160} height={54} className="h-10 w-auto mx-auto mb-6" />
        <h1 className="text-2xl font-extrabold text-rd-navy">Crea tu cuenta docente</h1>
        <p className="mt-1 text-sm text-slate-500">
          Regístrate para comprar y guardar tus materiales. Si ya compraste antes con este correo, esto le pone
          contraseña a esa cuenta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-rd-sm bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}
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
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-rd-sm border border-slate-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-rd-sky focus:border-rd-sky"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-rd-navy"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-500 mb-1">
            Confirma tu contraseña
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-rd-sm border border-slate-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-rd-sky focus:border-rd-sky"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-rd-navy"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-bold text-white hover:bg-rd-navy transition disabled:opacity-60"
        >
          {submitting ? "Creando cuenta…" : "Registrarme"}
        </button>
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
