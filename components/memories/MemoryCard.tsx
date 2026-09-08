'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Camera, Film, Dog, Crosshair, Music, CloudOff } from 'lucide-react';
import { Memory, STAGES } from '@/lib/types';
import { StageIcon } from '@/components/ui/Icons';
import { formatMemoryDate } from '@/lib/dates';
import { safeImageSrc, thumbUrl, videoPosterUrl } from '@/lib/media';

interface MemoryCardProps {
  memory: Memory;
  onClick: (memory: Memory) => void;
  onFlyTo?: (memory: Memory) => void;
  /** Las primeras tarjetas visibles cargan con prioridad; el resto, en diferido. */
  priority?: boolean;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onClick, onFlyTo, priority = false }) => {
  const stage = STAGES.find((s) => s.id === memory.stageId);
  const photosCount = memory.media.filter((m) => m.type === 'image').length;
  const videosCount = memory.media.filter((m) => m.type === 'video').length;
  const audiosCount = memory.media.filter((m) => m.type === 'audio').length;
  const hasBruno = memory.participants.includes('Bruno');

  const firstImage = memory.media.find((m) => m.type === 'image')?.url;
  const firstVideo = memory.media.find((m) => m.type === 'video')?.url;
  // Miniatura de 640px en vez de la foto original: la tarjeta nunca pasa
  // de ~420px de ancho, así que descargar 4 MB era desperdicio puro.
  const cover = firstImage
    ? safeImageSrc(thumbUrl(firstImage, { width: 640, height: 480 }))
    : firstVideo
      ? safeImageSrc(videoPosterUrl(firstVideo, 640))
      : '';

  return (
    <motion.article
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors duration-200 hover:border-emerald-300 hover:shadow-lg"
    >
      {/* Toda la tarjeta es un botón real: antes era un div con onClick, sin
          acceso por teclado ni rol semántico. */}
      <button
        type="button"
        onClick={() => onClick(memory)}
        className="flex flex-1 flex-col text-left"
        aria-label={`Abrir recuerdo: ${memory.title}`}
      >
        <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100">
          {cover ? (
            <img
              src={cover}
              alt=""
              width={640}
              height={480}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <StageIcon name={stage?.iconName ?? 'home'} className="h-9 w-9" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-center justify-between gap-1">
            {stage && (
              <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm">
                <StageIcon name={stage.iconName} className="h-3 w-3 text-emerald-700" />
                <span className="min-w-0 max-w-[120px] truncate">{stage.title}</span>
              </span>
            )}

            {memory.pendingSync && (
              <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-xs font-bold text-amber-950 shadow-sm">
                <CloudOff className="h-3 w-3" />
                En espera
              </span>
            )}

            {hasBruno && !memory.pendingSync && (
              <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-xs font-bold text-amber-950 shadow-sm">
                <Dog className="h-3 w-3" />
                <span>Bruno</span>
              </span>
            )}
          </div>

          <div className="pointer-events-none absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
            {photosCount > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                <Camera className="h-3 w-3" />
                {photosCount}
                <span className="sr-only-focusable">fotos</span>
              </span>
            )}
            {videosCount > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                <Film className="h-3 w-3" />
                {videosCount}
                <span className="sr-only-focusable">videos</span>
              </span>
            )}
            {audiosCount > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-violet-600/85 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                <Music className="h-3 w-3" />
                {audiosCount}
                <span className="sr-only-focusable">audios</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <time dateTime={memory.date} className="font-semibold">
              {formatMemoryDate(memory.date)}
            </time>
            <span className="font-medium">por {memory.createdBy === 'Jazmin' ? 'Jazmín' : 'Ariel'}</span>
          </div>

          <h3 className="line-clamp-1 text-base font-bold text-slate-900 transition-colors group-hover:text-emerald-700">
            {memory.title}
          </h3>

          {memory.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">{memory.description}</p>
          )}
        </div>
      </button>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-1 text-xs font-medium text-emerald-800">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          <span className="min-w-0 truncate">{memory.locationName}</span>
        </span>

        {onFlyTo && (
          <button
            type="button"
            onClick={() => onFlyTo(memory)}
            title="Centrar en el mapa"
            className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
          >
            <Crosshair className="h-4 w-4" aria-hidden />
            <span className="sr-only">Centrar en el mapa</span>
          </button>
        )}
      </div>
    </motion.article>
  );
};
