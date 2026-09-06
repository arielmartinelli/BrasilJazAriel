'use client';

import React, { useCallback, useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, MapPin, Share2, Compass, Check, ChevronLeft, ChevronRight,
  Edit3, Trash2, ExternalLink,
} from 'lucide-react';
import { Memory, STAGES } from '@/lib/types';
import { StageIcon, ParticipantBadge } from '@/components/ui/Icons';
import { formatMemoryDate } from '@/lib/dates';
import { safeImageSrc, thumbUrl, videoPosterUrl } from '@/lib/media';
import { showConfirmAlert } from '@/lib/alerts';
import { useModalA11y } from '@/hooks/useModalA11y';

interface MemoryDetailModalProps {
  memory: Memory | null;
  onClose: () => void;
  onFlyTo?: (memory: Memory) => void;
  onEdit?: (memory: Memory) => void;
  onDelete?: (memoryId: string) => void;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({
  memory, onClose, onFlyTo, onEdit, onDelete,
}) => {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const titleId = useId();
  const containerRef = useModalA11y(Boolean(memory), onClose);

  // Volver a la primera foto al abrir otro recuerdo.
  // Se ajusta durante el render (patrón oficial de React para derivar estado
  // de las props) en vez de dentro de un efecto, que provocaba un render extra.
  const [lastMemoryId, setLastMemoryId] = useState(memory?.id);
  if (memory?.id !== lastMemoryId) {
    setLastMemoryId(memory?.id);
    setIndex(0);
  }

  const total = memory?.media.length ?? 0;

  const next = useCallback(() => {
    if (total <= 1) return;
    setIndex((value) => (value + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    if (total <= 1) return;
    setIndex((value) => (value - 1 + total) % total);
  }, [total]);

  // Flechas del teclado para pasar fotos.
  useEffect(() => {
    if (!memory) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [memory, next, prev]);

  const handleShare = useCallback(async () => {
    if (!memory) return;
    const url = `${window.location.origin}/?memory=${encodeURIComponent(memory.id)}`;

    // En el celular abre la hoja de compartir nativa; en desktop copia el link.
    if (navigator.share) {
      try {
        await navigator.share({ title: memory.title, text: memory.locationName, url });
        return;
      } catch {
        /* la persona canceló: seguimos al portapapeles */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* sin permiso de portapapeles: no hacemos nada ruidoso */
    }
  }, [memory]);

  const handleDelete = useCallback(async () => {
    if (!memory || !onDelete) return;
    const confirmed = await showConfirmAlert(
      '¿Eliminar este recuerdo?',
      `"${memory.title}" se borrará junto con sus fotos y videos. Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    onDelete(memory.id);
    onClose();
  }, [memory, onDelete, onClose]);

  return (
    <AnimatePresence>
      {memory && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden p-0 sm:items-center sm:p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/65 backdrop-blur-sm"
          />

          <motion.div
            ref={containerRef}
            tabIndex={-1}
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl outline-none sm:rounded-3xl"
          >
            <div className="flex w-full justify-center pb-1 pt-3 sm:hidden">
              <span className="h-1.5 w-12 rounded-full bg-slate-200" aria-hidden />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-sm backdrop-blur-md transition hover:bg-black sm:right-4 sm:top-4"
            >
              <X className="h-4 w-4" aria-hidden />
              <span className="sr-only">Cerrar</span>
            </button>

            {/* Visor de fotos y videos */}
            <div className="relative flex aspect-video w-full select-none items-center justify-center overflow-hidden bg-slate-900 sm:aspect-16/10">
              {total > 0 ? (
                <motion.div
                  key={index}
                  className="h-full w-full"
                  drag={total > 1 ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.18}
                  onDragEnd={(_, info) => {
                    // Deslizar con el dedo para pasar fotos.
                    if (info.offset.x < -60) next();
                    else if (info.offset.x > 60) prev();
                  }}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.18 }}
                >
                  {memory.media[index]?.type === 'video' ? (
                    <video
                      src={memory.media[index].url}
                      poster={safeImageSrc(videoPosterUrl(memory.media[index].url, 1200))}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <img
                      src={safeImageSrc(thumbUrl(memory.media[index]?.url, { width: 1400, crop: 'fit' }))}
                      alt={memory.media[index]?.caption || memory.title}
                      className="h-full w-full object-cover sm:object-contain"
                      draggable={false}
                    />
                  )}
                </motion.div>
              ) : (
                <p className="text-sm text-slate-400">Sin fotografías adjuntas</p>
              )}

              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/80"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Foto anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/80"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Foto siguiente</span>
                  </button>

                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur-md">
                    {memory.media.map((item, dotIndex) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIndex(dotIndex)}
                        className={`h-1.5 rounded-full transition-all ${
                          index === dotIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'
                        }`}
                      >
                        <span className="sr-only">Ver archivo {dotIndex + 1}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {total > 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
                  {index + 1} de {total}
                </span>
              )}
            </div>

            {/* Tira de miniaturas: navegar 20 fotos con puntitos era imposible. */}
            {total > 2 && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                {memory.media.map((item, thumbIndex) => {
                  const src = item.type === 'video'
                    ? safeImageSrc(videoPosterUrl(item.url, 120))
                    : safeImageSrc(thumbUrl(item.url, { width: 120, height: 120 }));
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIndex(thumbIndex)}
                      aria-current={index === thumbIndex}
                      className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        index === thumbIndex
                          ? 'border-emerald-600 opacity-100'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      {src ? (
                        <img src={src} alt="" width={120} height={120} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-slate-800 text-xs text-white">▶</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Detalle */}
            <div className="flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {(() => {
                    const stage = STAGES.find((s) => s.id === memory.stageId);
                    return stage ? (
                      <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                        <StageIcon name={stage.iconName} className="h-3.5 w-3.5 text-emerald-700" />
                        {stage.title}
                      </span>
                    ) : null;
                  })()}
                  <time dateTime={memory.date} className="text-xs font-medium text-slate-500">
                    {formatMemoryDate(memory.date, 'long')}
                  </time>
                </div>

                {onFlyTo && (
                  <button
                    type="button"
                    onClick={() => { onFlyTo(memory); onClose(); }}
                    className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <Compass className="h-3.5 w-3.5" aria-hidden />
                    Ver en el mapa
                  </button>
                )}
              </div>

              <h2 id={titleId} className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {memory.title}
              </h2>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                  {memory.locationName}
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${memory.coordinates[1]},${memory.coordinates[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  Google Maps
                  <ExternalLink className="h-3 w-3 text-emerald-600" aria-hidden />
                </a>
              </div>

              {memory.description && (
                <p className="whitespace-pre-line rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-700 sm:text-base">
                  {memory.description}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-400">Estuvieron:</span>
                  {memory.participants.map((participant) => (
                    <ParticipantBadge key={participant} participant={participant} />
                  ))}
                </div>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  por <strong className="text-slate-900">{memory.createdBy === 'Jazmin' ? 'Jazmín' : 'Ariel'}</strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4">
                <div className="flex items-center gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => { onEdit(memory); onClose(); }}
                      className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden />
                      Modificar
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Eliminar
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
                      <span className="text-emerald-700">Enlace copiado</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" aria-hidden />
                      Compartir
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
