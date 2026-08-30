"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/planes", label: "Rutas" },
  { href: "/biblioteca", label: "Biblioteca" },
];

export default function Header() {
  const { cartCount, isLoggedIn, account, logout } = useStore();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleLogout() {
    logout();
    setOpen(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center shrink-0" aria-label="Ruta Didáctica · Inicio">
            <Image
              src="/brand/logo.png"
              alt="Ruta Didáctica"
              width={168}
              height={56}
              priority
              className="h-10 w-auto"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-rd-navy">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-rd-violet transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/carrito"
              className="relative rounded-rd-sm p-2 text-rd-navy hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-rd-sky"
              aria-label="Carrito"
            >
              <CartIcon />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rd-violet px-1 text-[11px] font-semibold text-white"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            {isLoggedIn ? (
              <>
                <Link
                  href="/biblioteca"
                  className="rounded-rd-sm border border-slate-300 px-4 py-2 text-sm font-semibold text-rd-navy hover:border-rd-sky"
                >
                  {account?.name}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-rd-sm px-3 py-2 text-sm font-semibold text-slate-500 hover:text-rd-navy"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/cuenta/iniciar-sesion"
                  className="rounded-rd-sm border border-slate-300 px-4 py-2 text-sm font-semibold text-rd-navy hover:border-rd-sky"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/cuenta/registro"
                  className="rounded-rd-sm bg-rd-violet px-4 py-2 text-sm font-semibold text-white hover:bg-rd-navy transition-colors"
                >
                  Registrarme
                </Link>
              </>
            )}
          </div>

          <button
            className="lg:hidden p-2 text-rd-navy"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="lg:hidden overflow-hidden border-t border-slate-200 bg-white"
          >
            <div className="px-4 pb-4 pt-3 space-y-3">
              <nav className="flex flex-col gap-1 text-sm font-medium text-rd-navy">
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-rd-sm px-2 py-2 hover:bg-slate-50"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-2 pt-2">
                <Link
                  href="/carrito"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-rd-sm border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-rd-navy"
                >
                  Carrito ({cartCount})
                </Link>
                {isLoggedIn && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex-1 rounded-rd-sm border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-rd-navy"
                  >
                    Cerrar sesión
                  </button>
                )}
                {!isLoggedIn && (
                  <>
                    <Link
                      href="/cuenta/iniciar-sesion"
                      onClick={() => setOpen(false)}
                      className="flex-1 rounded-rd-sm border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-rd-navy"
                    >
                      Iniciar sesión
                    </Link>
                    <Link
                      href="/cuenta/registro"
                      onClick={() => setOpen(false)}
                      className="flex-1 rounded-rd-sm bg-rd-violet px-3 py-2 text-center text-sm font-semibold text-white"
                    >
                      Registrarme
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      ) : (
        <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
      )}
    </svg>
  );
}
