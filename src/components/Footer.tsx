import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <Image src="/brand/logo.png" alt="Ruta Didáctica" width={150} height={50} className="h-9 w-auto mb-3" />
          <p className="text-sm text-slate-500 max-w-xs">
            Materiales alineados al NEM 2022 para docentes de primaria. Diseño que comunica, estructura
            que acompaña.
          </p>
        </div>

        <FooterCol
          title="Rutas"
          links={[
            { href: "/planes", label: "Ruta Base" },
            { href: "/planes", label: "Ruta Visual" },
            { href: "/planes", label: "Ruta Seguimiento" },
            { href: "/planes", label: "Ruta Integral" },
            { href: "/planes#precios", label: "Precios por cobertura" },
          ]}
        />

        <FooterCol
          title="Cuenta"
          links={[
            { href: "/cuenta/iniciar-sesion", label: "Iniciar sesión" },
            { href: "/cuenta/registro", label: "Registrarme" },
            { href: "/biblioteca", label: "Mi biblioteca" },
            { href: "/carrito", label: "Carrito" },
          ]}
        />

        <FooterCol
          title="Ayuda"
          links={[
            { href: "/ayuda", label: "Preguntas frecuentes" },
            { href: "/ayuda#soporte", label: "Soporte y contacto" },
            { href: "/ayuda#actualizaciones", label: "Política de actualización" },
          ]}
        />
      </div>

      <div className="bg-rd-violet">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/90">
          <div className="flex items-center gap-2">
            <PinIcon />
            <span>Ruta Didáctica · Cada aprendizaje tiene su camino.</span>
          </div>
          <p>Material independiente alineado a la NEM; no es un producto oficial de la SEP.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-rd-navy mb-3">{title}</h3>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-sm text-slate-500 hover:text-rd-violet transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#00B7C3">
      <path d="M12 0C7.6 0 4 3.6 4 8c0 6 8 16 8 16s8-10 8-16c0-4.4-3.6-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z" />
    </svg>
  );
}
