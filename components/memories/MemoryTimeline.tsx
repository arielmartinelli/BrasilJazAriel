'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Camera, Film, Dog } from 'lucide-react';
import type { Memory } from '@/lib/types';
import { STAGES } from '@/lib/types';
import { StageIcon } from '@/components/ui/Icons';
import { formatMemoryDate, formatMonthLabel, monthKey } from '@/lib/dates';
import { safeImageSrc, thumbUrl, videoPosterUrl } from '@/lib/media';

interface MemoryTimelineProps {
  /** Ya vienen ordenados desde el padre. */
  memories: Memory[];
  onOpen: (memory: Memory) => void;
  onFlyTo: (memory: Memory) => void;
}

/**
 * Línea de tiempo vertical agrupada por mes.
 * Complementa la grilla del Muro: la grilla muestra "qué hay",
 * la línea de tiempo muestra "cómo fue pasando".
 */
export const MemoryTimeline: React.FC<MemoryTimelineProps> = ({ memories, onOpen, onFlyTo }) => {
  const groups = useMemo(() => {
    const map = new Map<string, Memory[]>();
    for (const memory of memories) {
      const key = monthKey(memory.date);
      const bucket = map.get(key);
      if (bucket) bucket.push(memory);
      else map.set(key, [memory]);
    }
    return Array.from(map.entries());
  }, [memories]);

  if (memories.length === 0) return null;

  return (
    <ol className="relative flex flex-col gap-8">
      {groups.map(([key, items]) => (
        <li key={key}>
          <h3 className="sticky top-0 z-10 mb-4 flex items-center gap-2 bg-slate-50/95 py-2 text-sm font-bold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
            <span className="h-px flex-1 bg-slate-200" aria-hidden />
            <span>{formatMonthLabel(items[0].date)}</span>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
              {items.length}
            </span>
            <span className="h-px flex-1 bg-slate-200" aria-hidden />
          </h3>

          <ul className="relative flex flex-col gap-4 border-l-2 border-dashed border-emerald-200 pl-6 sm:pl-8">
            {items.map((memory, index) => {
              const stage = STAGES.find((s) => s.id === memory.stageId);
              const image = memory.media.find((m) => m.type === 'image')?.url;
              const video = memory.media.find((m) => m.type === 'video')?.url;
              const thumb = image
                ? safeImageSrc(thumbUrl(image, { width: 200, height: 200 }))
                : video
                  ? safeImageSrc(videoPosterUrl(video, 200))
                  : '';
              const photos = memory.media.filter((m) => m.type === 'image').length;
              const videos = memory.media.filter((m) => m.type === 'video').length;

              return (
                <motion.li
                  key={memory.id}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.2) }}
                  className="relative"
                >
                  {/* Punto sobre la línea */}
                  <span
                    className="absolute -left-[calc(1.5rem+7px)] top-6 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-emerald-600 shadow sm:-left-[calc(2rem+7px)]"
                    style={stage ? { backgroundColor: stage.color } : undefined}
                    aria-hidden
                  />

                  <button
                    type="button"
                    onClick={() => onOpen(memory)}
                    className="flex w-full items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-300 hover:shadow-md sm:gap-4 sm:p-3.5"
                  >
                    <span className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-20">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          width={200}
                          height={200}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-slate-300">
                          <StageIcon name={stage?.iconName ?? 'home'} className="h-6 w-6" />
                        </span>
                      )}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <time dateTime={memory.date} className="font-semibold">
                          {formatMemoryDate(memory.date)}
                        </time>
                        {stage && (
                          <span className="flex items-center gap-1 font-semibold text-slate-600">
                            <StageIcon name={stage.iconName} className="h-3 w-3 text-emerald-700" />
                            {stage.title}
                          </span>
                        )}
                        {memory.participants.includes('Bruno') && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900">
                            <Dog className="h-3 w-3" />
                            Bruno
                          </span>
                        )}
                      </span>

                      <span className="min-w-0 truncate text-base font-bold text-slate-900">{memory.title}</span>

                      <span className="flex items-center gap-2.5 text-xs text-slate-500">
                        <span className="flex min-w-0 items-center gap-1 text-emerald-800">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="min-w-0 truncate">{memory.locationName}</span>
                        </span>
                        {photos > 0 && (
                          <span className="flex shrink-0 items-center gap-1">
                            <Camera className="h-3 w-3" aria-hidden />
                            {photos}
                          </span>
                        )}
                        {videos > 0 && (
                          <span className="flex shrink-0 items-center gap-1">
                            <Film className="h-3 w-3" aria-hidden />
                            {videos}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onFlyTo(memory)}
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                    title="Ver en el mapa"
                  >
                    <MapPin className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Ver {memory.title} en el mapa</span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
};
