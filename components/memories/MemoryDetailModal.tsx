'use client';

import React, { useState } from 'react';
import { Memory, STAGES } from '@/lib/types';
import { StageIcon, ParticipantBadge } from '@/components/ui/Icons';
import { X, Calendar, MapPin, Share2, Compass, Check, ChevronLeft, ChevronRight, Edit3, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MemoryDetailModalProps {
  memory: Memory | null;
  onClose: () => void;
  onFlyTo?: (memory: Memory) => void;
  onEdit?: (memory: Memory) => void;
  onDelete?: (memoryId: string) => void;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({
  memory,
  onClose,
  onFlyTo,
  onEdit,
  onDelete,
}) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!memory) return null;

  const stage = STAGES.find((s) => s.id === memory.stageId);
  const currentMedia = memory.media[currentMediaIndex] || memory.media[0];

  const handleShare = () => {
    if (typeof navigator !== 'undefined') {
      const url = `${window.location.origin}/?memory=${memory.id}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const nextMedia = () => {
    if (memory.media.length <= 1) return;
    setCurrentMediaIndex((prev) => (prev + 1) % memory.media.length);
  };

  const prevMedia = () => {
    if (memory.media.length <= 1) return;
    setCurrentMediaIndex((prev) => (prev - 1 + memory.media.length) % memory.media.length);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(memory.id);
      onClose();
    }
  };

  const formattedDate = new Date(memory.date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto z-10 flex flex-col border border-slate-200"
        >
          {/* iOS drag indicator */}
          <div className="sm:hidden w-full flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-slate-200"></div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Media Player */}
          <div className="relative w-full aspect-video sm:aspect-[16/10] bg-slate-900 overflow-hidden flex items-center justify-center select-none">
            {currentMedia ? (
              currentMedia.type === 'video' ? (
                <video
                  src={currentMedia.url}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={currentMedia.url}
                  alt={memory.title}
                  className="w-full h-full object-cover sm:object-contain transition-all duration-300"
                />
              )
            ) : (
              <div className="text-slate-400 text-sm">Sin fotografías adjuntas</div>
            )}

            {memory.media.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevMedia();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextMedia();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md">
                  {memory.media.map((_, idx) => (
                    <span
                      key={idx}
                      onClick={() => setCurrentMediaIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        currentMediaIndex === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {memory.media.length > 0 && (
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] text-white font-medium">
                {currentMediaIndex + 1} de {memory.media.length}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {stage && (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                    <StageIcon name={stage.iconName} className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{stage.title}</span>
                  </span>
                )}
                <span className="text-xs text-slate-500 font-medium">
                  {formattedDate}
                </span>
              </div>

              {onFlyTo && (
                <button
                  onClick={() => {
                    onFlyTo(memory);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 transition"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Ver en el mapa</span>
                </button>
              )}
            </div>

            {/* Title */}
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {memory.title}
            </h2>

            {/* Location & Google Maps Link */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-emerald-700 font-semibold">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{memory.locationName}</span>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${memory.coordinates[1]},${memory.coordinates[0]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3 py-1 rounded-full border border-slate-200 hover:border-emerald-200 transition flex items-center gap-1.5"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3 text-emerald-600" />
              </a>
            </div>

            {/* Story Text */}
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-5 rounded-2xl border border-slate-200">
              {memory.description}
            </p>

            {/* Participants & Author */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 text-[11px] font-medium">Estuvieron:</span>
                {memory.participants.map((p) => (
                  <ParticipantBadge key={p} participant={p} />
                ))}
              </div>
              <span className="text-slate-500 text-xs font-medium">
                Publicado por <strong className="text-slate-900">{memory.createdBy}</strong>
              </span>
            </div>

            {/* Actions Bar (Modify, Delete, Share) */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              {/* Edit and Delete Actions */}
              <div className="flex items-center gap-2">
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(memory);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Modificar</span>
                  </button>
                )}

                {onDelete && !isConfirmingDelete && (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                )}

                {isConfirmingDelete && (
                  <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-full border border-rose-200">
                    <span className="text-[11px] text-rose-800 font-semibold px-2">¿Eliminar?</span>
                    <button
                      onClick={handleDelete}
                      className="px-2.5 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition"
                    >
                      Sí, borrar
                    </button>
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2 py-1 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold transition"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>

              {/* Share button */}
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-emerald-700">Enlace copiado</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Compartir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
