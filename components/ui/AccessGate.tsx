'use client';

import React, { useState } from 'react';
import { Lock, Loader2, AlertTriangle } from 'lucide-react';
import { ArgBraFlagLogo } from './ArgBraFlagLogo';
import { submitAccessCode } from '@/lib/memoryStore';

interface AccessGateProps {
  onUnlocked: () => void;
}

/**
 * Puerta de entrada al diario.
 *
 * El codigo nunca se compara en el navegador: se manda a /api/session, que lo
 * verifica contra APP_ACCESS_CODE en tiempo constante y devuelve una cookie
 * httpOnly firmada. Por eso no sirve de nada mirar el codigo fuente.
 */
export const AccessGate: React.FC<AccessGateProps> = ({ onUnlocked }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim() || isChecking) return;

    setIsChecking(true);
    setError(null);
    try {
      await submitAccessCode(code);
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo verificar el código');
      setCode('');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-emerald-50 via-slate-50 to-amber-50 px-5">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <ArgBraFlagLogo size={52} />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Nossa História</h1>
            <p className="mt-1 text-sm text-slate-500">Ariel, Jazmín &amp; Bruno en Brasil</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="access-code" className="text-sm font-semibold text-slate-800">
            Código de acceso
          </label>

          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="access-code"
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'access-error' : undefined}
              placeholder="Escribí el código compartido"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 text-base text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {error && (
            <p
              id="access-error"
              role="alert"
              className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isChecking || !code.trim()}
            className="mt-1 flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50"
          >
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            <span>{isChecking ? 'Verificando…' : 'Entrar'}</span>
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
          Este diario es privado. Solo Ariel y Jazmín tienen el código.
        </p>
      </div>
    </main>
  );
};
