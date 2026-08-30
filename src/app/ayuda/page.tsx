import Link from "next/link";

const faqs = [
  {
    q: "¿Cómo elijo la ruta correcta?",
    a: "Solo vendemos 4 rutas completas por grado: Base, Visual, Seguimiento e Integral. Elige tu grado, la cobertura temporal (quincena, mes, trimestre o ciclo completo) y la ruta que mejor se ajuste a tu acompañamiento; no se venden planeaciones, fichas o diapositivas por separado.",
  },
  {
    q: "¿Los materiales están alineados a la SEP?",
    a: "Material independiente alineado a la NEM; no es un producto oficial de la SEP.",
  },
  {
    q: "¿Puedo editar los archivos?",
    a: "Los archivos incluidos en cada ruta pueden modificarse desde tu programa de oficina habitual y están listos para imprimir.",
  },
  {
    q: "¿Qué pasa si hay una actualización?",
    a: "Cada ruta incluye las actualizaciones del ciclo 2026-2027. Podrás descargar la versión más reciente desde tu biblioteca sin costo adicional.",
  },
  {
    q: "¿Qué hago si falla una descarga?",
    a: "No pudimos completar la descarga. Intenta nuevamente o contacta soporte desde esta misma página.",
  },
];

const steps = [
  { n: "1", title: "Elige", text: "Selecciona tu ruta, grado y cobertura temporal." },
  { n: "2", title: "Revisa", text: "Consulta qué incluye la ruta y su licencia antes de comprar." },
  { n: "3", title: "Descarga", text: "Compra y descarga desde tu biblioteca cuando lo necesites." },
];

export default function AyudaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="text-3xl font-extrabold text-rd-navy mb-2">Ayuda y preguntas frecuentes</h1>
      <p className="text-slate-500 mb-12">
        Resolvemos dudas de compra, descarga, uso y soporte con claridad profesional y cercanía.
      </p>

      <section id="como-funciona" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-rd-navy mb-5">Cómo funciona</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {steps.map((s) => (
            <div key={s.n} className="rounded-rd-md border border-slate-200 p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rd-turquoise text-sm font-bold text-rd-navy">
                {s.n}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-rd-navy">{s.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-14">
        <h2 className="text-xl font-bold text-rd-navy mb-5">Preguntas frecuentes</h2>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-rd-navy list-none">
                {f.q}
                <span className="ml-4 text-rd-violet group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-2 text-sm text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="actualizaciones" className="mb-14 scroll-mt-20">
        <h2 className="text-xl font-bold text-rd-navy mb-3">Política de actualización</h2>
        <p className="text-sm text-slate-600">
          Contenido actualizado y listo para aplicar. Cuando un material recibe cambios alineados al NEM
          2022, la nueva versión queda disponible sin costo adicional en tu biblioteca.
        </p>
      </section>

      <section id="soporte" className="rounded-rd-lg bg-slate-50 border border-slate-200 p-6 scroll-mt-20">
        <h2 className="text-xl font-bold text-rd-navy mb-2">Soporte y contacto</h2>
        <p className="text-sm text-slate-600 mb-4">
          Acompañamiento continuo para tu práctica docente. Escríbenos y te respondemos en menos de 24
          horas hábiles.
        </p>
        <Link
          href="mailto:soporte@mail.mx"
          className="inline-flex rounded-rd-md bg-rd-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-rd-navy transition"
        >
          soporte@rutadidactica.mx
        </Link>
      </section>
    </div>
  );
}
