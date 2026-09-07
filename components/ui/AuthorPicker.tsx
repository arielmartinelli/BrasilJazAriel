'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Dog } from 'lucide-react';
import { ArgBraFlagLogo } from './ArgBraFlagLogo';

interface AuthorPickerProps {
  onPick: (author: 'Ariel' | 'Jazmin') => void;
}

const AUTHORS = [
  {
    id: 'Ariel' as const,
    label: 'Ariel',
    initial: 'A',
    ring: 'hover:border-emerald-500 focus-visible:border-emerald-500',
    dot: 'bg-emerald-600',
  },
  {
    id: 'Jazmin' as const,
    label: 'Jazmín',
    initial: 'J',
    ring: 'hover:border-teal-500 focus-visible:border-teal-500',
    dot: 'bg-teal-600',
  },
];

/**
 * "¿Quién está cargando?" — aparece al abrir la página.
 *
 * La elección vive en sessionStorage: recargar no vuelve a preguntar, cerrar
 * la pestaña sí. Esto reemplaza al toggle que quedaba fijo para siempre en el
 * navegador, donde era fácil publicar sin querer con el nombre del otro.
 */
export const AuthorPicker: React.FC<AuthorPickerProps> = ({ onPick }) => {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-emerald-50 via-slate-50 to-amber-50 px-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 shadow-xl"
      >
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <ArgBraFlagLogo size={52} />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              ¿Quién está cargando?
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              Los recuerdos que guardes van a quedar firmados con este nombre.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {AUTHORS.map((author) => (
            <button
              key={author.id}
              type="button"
              onClick={() => onPick(author.id)}
              className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-5 transition hover:bg-white hover:shadow-md active:scale-[0.98] ${author.ring}`}
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white ${author.dot}`}
                aria-hidden
              >
                {author.initial}
              </span>
              <span className="text-base font-bold text-slate-900">{author.label}</span>
            </button>
          ))}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <Dog className="h-3.5 w-3.5" aria-hidden />
          Bruno se elige después, en cada recuerdo
        </p>
      </motion.div>
    </main>
  );
};
