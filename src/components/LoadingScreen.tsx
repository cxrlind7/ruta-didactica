// Pantalla de carga de fondo transparente (no cubre el contenido con un
// color, solo un spinner centrado) para los momentos en que la página ya se
// pintó pero todavía se están trayendo los recursos (árbol de archivos,
// biblioteca, etc.).
export default function LoadingScreen({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-transparent">
      <span
        className="h-10 w-10 animate-spin rounded-full border-2 border-rd-violet/25 border-t-rd-violet"
        aria-hidden
      />
      <p className="text-sm font-medium text-rd-navy">{label}</p>
    </div>
  );
}
