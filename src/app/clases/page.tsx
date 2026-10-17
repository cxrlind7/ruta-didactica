import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatMXN } from "@/lib/data";
import Reveal from "@/components/Reveal";
import AgregarClaseButton from "@/components/AgregarClaseButton";

// Los precios salen de Clase (editables en /admin/pagos) -- no se puede
// prerenderizar en build time o quedarían congelados.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Clases sueltas · Ruta Didáctica",
  description: "Clases de Español listas para exponer: compra solo el tema que necesitas.",
};

export default async function ClasesPage() {
  const clases = await prisma.clase.findMany({
    where: { activa: true, archivoDrive: { ingestedAt: { not: null } } },
    select: { id: true, titulo: true, precioMXN: true },
    orderBy: { titulo: "asc" },
  });
  const desde = clases.length ? Math.min(...clases.map((c) => c.precioMXN)) : null;

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div
          aria-hidden
          className="animate-rd-blob pointer-events-none absolute -top-20 right-0 h-72 w-72 rounded-full bg-rd-turquoise/15 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-5xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8 pt-14 lg:pt-20 pb-12">
          <div className="text-center lg:text-left">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-wider text-rd-violet">Clases sueltas · Español</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold text-rd-navy leading-tight">
                Compra solo el tema que necesitas
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-5 text-lg text-slate-600 mx-auto max-w-lg lg:mx-0">
                Presentaciones listas para exponer en clase. Se descargan al momento desde tu biblioteca.
                {desde !== null && (
                  <>
                    {" "}
                    <span className="font-semibold text-rd-violet">Desde {formatMXN(desde)} por clase.</span>
                  </>
                )}
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.2}>
            <Image
              src="/brand/materias/espanol.png"
              alt="Español"
              width={800}
              height={767}
              sizes="220px"
              loading="eager"
              className="mx-auto w-44 lg:w-56 drop-shadow-xl"
            />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20">
        {clases.length === 0 ? (
          <p className="rounded-rd-md border border-dashed border-slate-300 p-12 text-center text-slate-500">
            Muy pronto habrá clases disponibles aquí.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-500">{clases.length} clases disponibles</p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clases.map((clase) => (
                <li
                  key={clase.id}
                  className="flex flex-col rounded-rd-lg border border-slate-200 bg-white p-5 transition-shadow hover:shadow-lg"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide text-rd-violet">Español</p>
                  <h2 className="mt-1 flex-1 text-sm font-bold text-rd-navy leading-snug">{clase.titulo}</h2>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xl font-extrabold text-rd-navy">{formatMXN(clase.precioMXN)}</span>
                    <AgregarClaseButton clase={clase} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  );
}
