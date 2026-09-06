import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <span className="text-5xl" aria-hidden>🧭</span>
      <h1 className="text-2xl font-bold text-slate-900">Esta página no existe</h1>
      <p className="max-w-sm text-sm leading-relaxed text-slate-600">
        Puede que el enlace esté mal escrito o que el recuerdo ya no esté disponible.
      </p>
      <Link
        href="/"
        className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      >
        Volver al mapa
      </Link>
    </main>
  );
}
