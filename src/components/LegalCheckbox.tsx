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
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        <strong className="text-rd-navy">Ruta Didáctica comercializa materiales educativos digitales.</strong> La
        compra corresponde al grado, periodo, cobertura y modalidad seleccionados. Los productos son digitales.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        Las <strong className="text-rd-navy">planeaciones, fichas, evidencias y diapositivas</strong> se habilitarán
        progresivamente <strong className="text-rd-navy">una semana antes de su aplicación</strong>. La licencia es
        individual. No se autoriza la reventa ni distribución masiva. Las compras son definitivas una vez habilitado
        el acceso.
      </p>
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
