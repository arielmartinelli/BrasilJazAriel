'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, ChevronRight, ChevronLeft, MapPin, Camera, Images } from 'lucide-react';
import { Memory, STAGES } from '@/lib/types';
import { StageIcon, ParticipantBadge } from '@/components/ui/Icons';
import { InteractiveMap, InteractiveMapRef } from '@/components/map/InteractiveMap';
import { formatMemoryDate } from '@/lib/dates';
import { sortChronologically } from '@/lib/stats';
import { safeImageSrc, thumbUrl, videoPosterUrl } from '@/lib/media';

interface StoryTourProps {
  memories: Memory[];
  onOpenDetail: (memory: Memory) => void;
}

const AUTOPLAY_MS = 5500;

export const StoryTour: React.FC<StoryTourProps> = ({ memories, onOpenDetail }) => {
  // Sin useMemo, cada render creaba un array nuevo y el efecto que hace flyTo
  // se disparaba en bucle (dependía del objeto, no del id).
  const chapters = useMemo(() => sortChronologically(memories), [memories]);

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mapRef = useRef<InteractiveMapRef>(null);

  const total = chapters.length;
  // Si cambian los filtros y quedan menos capítulos, el índice se acota al
  // vuelo durante el render en lugar de corregirse con un efecto extra.
  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;
  const current = chapters[safeIndex];
  const stage = STAGES.find((s) => s.id === current?.stageId);

  useEffect(() => {
    if (!current) return;
    mapRef.current?.flyToMemory(current, 13.5);
    // Depende del id, no del objeto: evita vuelos repetidos en cada render.
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isPlaying || total <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((value) => {
        if (value + 1 >= total) {
          setIsPlaying(false);
          return 0;
        }
        return value + 1;
      });
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [isPlaying, total]);

  const goNext = useCallback(() => setIndex((value) => Math.min(value + 1, total - 1)), [total]);
  const goPrev = useCallback(() => setIndex((value) => Math.max(value - 1, 0)), []);


  // Flechas del teclado para recorrer la historia.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === ' ') {
        event.preventDefault();
        setIsPlaying((value) => !value);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  if (total === 0 || !current) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-xs">
          <MapPin className="h-7 w-7" aria-hidden />
        </span>
        <h3 className="mb-1.5 text-lg font-bold text-slate-900">Su historia empieza acá</h3>
        <p className="max-w-sm text-sm leading-relaxed text-slate-500">
          Todavía no hay momentos que coincidan. Cargá el primer recuerdo del viaje y esta
          sección se va a ir armando sola, en orden cronológico.
        </p>
      </div>
    );
  }

  const photo = current.media.find((m) => m.type === 'image')?.url;
  const video = current.media.find((m) => m.type === 'video')?.url;
  const cover = photo
    ? safeImageSrc(thumbUrl(photo, { width: 900, height: 560 }))
    : video
      ? safeImageSrc(videoPosterUrl(video, 900))
      : '';

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50 md:flex-row">
      <div className="relative order-1 h-[45%] w-full md:order-2 md:h-full md:flex-1">
        <InteractiveMap
          ref={mapRef}
          memories={chapters}
          selectedMemory={current}
          onSelectMemory={(memory) => {
            const found = chapters.findIndex((item) => item.id === memory.id);
            if (found !== -1) setIndex(found);
          }}
          // En el tour los pines son pocos y guiados: agruparlos confunde.
          enableClustering={false}
          showRouteByDefault
          centerOnUserOnLoad={false}
        />
      </div>

      <div className="order-2 z-20 flex h-[55%] w-full flex-col border-t border-slate-200 bg-white shadow-sm md:order-1 md:h-full md:w-[440px] md:border-r md:border-t-0 xl:w-[480px]">
        <div className="shrink-0 border-b border-slate-100 bg-white p-4 sm:p-5">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                Capítulo {safeIndex + 1} de {total}
              </span>
              {stage && (
                <span className="flex min-w-0 items-center gap-1 text-xs font-semibold text-slate-700">
                  <StageIcon name={stage.iconName} className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                  <span className="min-w-0 truncate">{stage.title}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsPlaying((value) => !value)}
              aria-pressed={isPlaying}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
            >
              {isPlaying ? (
                <><Pause className="h-3 w-3 text-amber-600" aria-hidden /> Pausar</>
              ) : (
                <><Play className="h-3 w-3 fill-emerald-700 text-emerald-700" aria-hidden /> Reproducir</>
              )}
            </button>
          </div>

          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={safeIndex + 1}
            aria-label="Progreso de la historia"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-amber-400 transition-all duration-500"
              style={{ width: `${((safeIndex + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-start overflow-x-clip overflow-y-auto p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.article
              key={current.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="my-auto flex flex-col gap-3"
            >
              {cover && (
                <button
                  type="button"
                  onClick={() => onOpenDetail(current)}
                  className="group relative aspect-16/10 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs"
                >
                  <img
                    src={cover}
                    alt={current.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    <Camera className="h-3 w-3" aria-hidden />
                    {current.media.length} {current.media.length === 1 ? 'archivo' : 'archivos'}
                  </span>
                </button>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <time dateTime={current.date} className="font-semibold text-slate-600">
                  {formatMemoryDate(current.date, 'long')}
                </time>
                <span aria-hidden>•</span>
                <span className="flex min-w-0 items-center gap-1 font-semibold text-emerald-700">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="min-w-0 truncate">{current.locationName}</span>
                </span>
              </div>

              <h2 className="text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">
                {current.title}
              </h2>

              {current.description && (
                <p className="text-sm leading-relaxed text-slate-600">{current.description}</p>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  {current.participants.map((participant) => (
                    <ParticipantBadge key={participant} participant={participant} />
                  ))}
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  por {current.createdBy === 'Jazmin' ? 'Jazmín' : 'Ariel'}
                </span>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        <div className="z-30 shrink-0 border-t border-slate-200 bg-white/95 p-3.5 backdrop-blur-md sm:p-4">
          <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={goPrev}
              disabled={safeIndex === 0}
              className="flex flex-1 items-center justify-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Anterior
            </button>

            <button
              type="button"
              onClick={() => onOpenDetail(current)}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-slate-200 active:scale-95"
            >
              <Images className="h-4 w-4" aria-hidden />
              Ver fotos
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={safeIndex === total - 1}
              className="flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
