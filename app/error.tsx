'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El detalle queda en la consola/logs, nunca en pantalla: un stack trace
    // visible puede revelar rutas y configuración del servidor.
    console.error('[error boundary]', error);
  }, [error]);

  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <span className="text-5xl" aria-hidden>🌴</span>
      <h1 className="text-2xl font-bold text-slate-900">Algo salió mal</h1>
      <p className="max-w-sm text-sm leading-relaxed text-slate-600">
        Tus recuerdos están a salvo. Volvé a intentar; si sigue fallando, recargá la página.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      >
        Reintentar
      </button>
    </main>
  );
}
