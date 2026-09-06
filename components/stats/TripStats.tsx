'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Camera, Film, MapPinned, Route, Dog } from 'lucide-react';
import type { Memory } from '@/lib/types';
import { computeStats } from '@/lib/stats';
import { formatMemoryDate } from '@/lib/dates';

interface TripStatsProps {
  memories: Memory[];
}

const numberFormatter = new Intl.NumberFormat('es-AR');

export const TripStats: React.FC<TripStatsProps> = ({ memories }) => {
  // Recalcular en cada render era barato con pocos recuerdos, pero la
  // distancia recorre todo el array: conviene memorizarlo.
  const stats = useMemo(() => computeStats(memories), [memories]);

  if (stats.totalMemories === 0) return null;

  const tiles = [
    {
      icon: CalendarDays,
      value: numberFormatter.format(stats.daysSinceStart),
      label: stats.daysSinceStart === 1 ? 'día de aventura' : 'días de aventura',
      hint: stats.firstDate ? `desde el ${formatMemoryDate(stats.firstDate)}` : undefined,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      icon: Route,
      value: numberFormatter.format(stats.kilometers),
      label: 'km entre paradas',
      hint: 'en línea recta',
      tone: 'text-sky-700 bg-sky-50 border-sky-200',
    },
    {
      icon: MapPinned,
      value: numberFormatter.format(stats.places),
      label: stats.places === 1 ? 'lugar visitado' : 'lugares visitados',
      tone: 'text-teal-700 bg-teal-50 border-teal-200',
    },
    {
      icon: Camera,
      value: numberFormatter.format(stats.photos),
      label: stats.photos === 1 ? 'foto' : 'fotos',
      tone: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      icon: Film,
      value: numberFormatter.format(stats.videos),
      label: stats.videos === 1 ? 'video' : 'videos',
      tone: 'text-violet-700 bg-violet-50 border-violet-200',
    },
    {
      icon: Dog,
      value: numberFormatter.format(stats.withBruno),
      label: 'momentos con Bruno',
      tone: 'text-orange-700 bg-orange-50 border-orange-200',
    },
  ];

  return (
    <section aria-label="Resumen del viaje">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile, index) => {
          const Icon = tile.icon;
          return (
            <motion.li
              key={tile.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
              className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs"
            >
              <span
                className={`mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border ${tile.tone}`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-2xl font-extrabold leading-none tracking-tight text-slate-900 tabular-nums">
                {tile.value}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">{tile.label}</p>
              {tile.hint && <p className="mt-0.5 text-xs text-slate-400">{tile.hint}</p>}
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
};
