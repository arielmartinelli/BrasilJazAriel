export default function Loading() {
  return (
    <div
      className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-slate-50"
      role="status"
      aria-live="polite"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
      <p className="text-sm font-medium text-slate-500">Cargando recuerdos…</p>
    </div>
  );
}
