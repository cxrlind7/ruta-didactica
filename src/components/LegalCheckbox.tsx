"use client";

export default function LegalCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-rd-sm border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-rd-navy">Información importante sobre tu compra</p>

      <div className="mt-2 max-h-64 space-y-3 overflow-y-auto pr-2 text-xs leading-relaxed text-slate-600">
        <p>
          <strong className="text-rd-navy">Ruta Didáctica comercializa materiales educativos digitales para docentes de
          primaria.</strong> Cada compra corresponde exclusivamente al grado, periodo, cobertura y modalidad
          seleccionados.
        </p>
        <p>
          <strong className="text-rd-navy">Ruta Base</strong> incluye planeación y fichas de trabajo.{" "}
          <strong className="text-rd-navy">Ruta Visual</strong> incluye planeación, fichas y diapositivas.{" "}
          <strong className="text-rd-navy">Ruta Seguimiento</strong> incluye planeación, fichas y sistema de
          seguimiento, registro y retroalimentación. <strong className="text-rd-navy">Ruta Integral</strong> reúne
          todos los recursos anteriores.
        </p>
        <p>
          Los productos son <strong className="text-rd-navy">digitales</strong> y no incluyen materiales impresos,
          dispositivos, clases particulares ni servicios escolares.
        </p>

        <div>
          <p className="font-bold text-rd-navy">Disponibilidad de los materiales</p>
          <p className="mt-1">
            Las planeaciones, fichas, evidencias y diapositivas se habilitarán progresivamente en la biblioteca
            digital del comprador <strong className="text-rd-navy">una semana antes del periodo previsto para su
            aplicación</strong>.
          </p>
          <p className="mt-1">
            Por ello, adquirir un mes, trimestre o ciclo escolar completo <strong className="text-rd-navy">no implica
            descargar inmediatamente todos los materiales futuros</strong>. La compra garantiza el acceso a la
            totalidad de los materiales contratados, que se irán habilitando conforme avance el calendario de
            aplicación.
          </p>
          <p className="mt-1">
            El Sistema de Seguimiento se entregará como recurso acumulativo del periodo correspondiente y, en
            coberturas mayores, se habilitará por mes o trimestre, según corresponda.
          </p>
          <p className="mt-1">
            Las fechas de publicación podrán ajustarse cuando existan modificaciones oficiales al calendario escolar
            o a la organización de los periodos de aplicación.
          </p>
        </div>

        <div>
          <p className="font-bold text-rd-navy">Licencia de uso</p>
          <p className="mt-1">
            La compra concede una <strong className="text-rd-navy">licencia individual de uso para un docente</strong>,
            correspondiente al grado, periodo y modalidad adquiridos.
          </p>
          <p className="mt-1">
            No se autoriza la reventa, publicación abierta, distribución masiva, intercambio, reproducción con fines
            comerciales ni comercialización total o parcial de los archivos.
          </p>
        </div>

        <div>
          <p className="font-bold text-rd-navy">Uso de inteligencia artificial</p>
          <p className="mt-1">
            Ruta Didáctica puede utilizar herramientas de inteligencia artificial como apoyo en procesos de diseño,
            organización, redacción, revisión y desarrollo de recursos. Los materiales publicados son revisados y
            adaptados antes de su entrega.
          </p>
          <p className="mt-1">
            Estas herramientas no sustituyen el criterio profesional del docente ni determinan por sí mismas
            evaluaciones, calificaciones o decisiones pedagógicas.
          </p>
        </div>

        <div>
          <p className="font-bold text-rd-navy">Naturaleza del servicio</p>
          <p className="mt-1">
            Ruta Didáctica es un proyecto educativo independiente y no implica certificación, autorización,
            patrocinio ni afiliación oficial con la Secretaría de Educación Pública u otra autoridad educativa.
          </p>
          <p className="mt-1">
            Los materiales constituyen recursos de apoyo a la práctica docente y no garantizan resultados académicos
            específicos.
          </p>
        </div>

        <div>
          <p className="font-bold text-rd-navy">Garantía de compra</p>
          <p className="mt-1">
            Ruta Didáctica garantiza que cada compra dará acceso a los materiales correspondientes al grado, periodo,
            cobertura y modalidad seleccionados, conforme al calendario de publicación informado.
          </p>
          <p className="mt-1">
            Por la naturaleza digital de los contenidos, las compras son definitivas una vez habilitado el acceso a
            los materiales adquiridos.
          </p>
          <p className="mt-1">
            Cualquier incidencia relacionada con el acceso, la entrega o el cobro será atendida mediante los canales
            de soporte de Ruta Didáctica conforme corresponda.
          </p>
          <p className="mt-1">
            Los precios se expresan en pesos mexicanos y el importe total se muestra antes de realizar el pago.
          </p>
        </div>

        <p className="font-semibold text-rd-navy">
          Antes de confirmar tu compra, verifica cuidadosamente que el grado, periodo, cobertura, modalidad,
          contenido y precio seleccionados sean los correctos.
        </p>
      </div>

      <label className="mt-3 flex items-start gap-2 text-xs text-rd-navy">
        <input
          type="checkbox"
          required
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-rd-violet focus:ring-rd-sky"
        />
        <span className="font-semibold">He leído y acepto los términos de esta compra.</span>
      </label>
    </div>
  );
}
