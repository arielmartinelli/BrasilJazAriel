'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Memory, STAGES } from '@/lib/types';
import { StageIcon, ParticipantBadge } from '@/components/ui/Icons';
import { InteractiveMap, InteractiveMapRef } from '@/components/map/InteractiveMap';
import { Play, Pause, ChevronRight, ChevronLeft, MapPin, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StoryTourProps {
  memories: Memory[];
  onOpenDetail: (memory: Memory) => void;
}

export const StoryTour: React.FC<StoryTourProps> = ({ memories, onOpenDetail }) => {
  const chronologicalMemories = [...memories].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const mapRef = useRef<InteractiveMapRef>(null);
  const currentMemory = chronologicalMemories[currentIndex] || chronologicalMemories[0];
  const stage = STAGES.find((s) => s.id === currentMemory?.stageId);

  useEffect(() => {
    if (currentMemory && mapRef.current) {
      mapRef.current.flyToMemory(currentMemory, 13.5);
    }
  }, [currentIndex, currentMemory]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev + 1 >= chronologicalMemories.length) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 5500);

    return () => clearInterval(timer);
  }, [isPlaying, chronologicalMemories.length]);

  const handleNext = () => {
    if (currentIndex < chronologicalMemories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (chronologicalMemories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 shadow-xs">
          <MapPin className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          Comienza su historia en Brasil
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
          Aún no hay momentos registrados. Cuando comiencen el viaje en auto, cada parada y recuerdo aparecerá aquí cronológicamente.
        </p>
      </div>
    );
  }

  const formattedDate = new Date(currentMemory.date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const mainPhoto = currentMemory.media.find((m) => m.type === 'image')?.url || currentMemory.media[0]?.url;

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row overflow-hidden bg-slate-50">
      {/* Map (Top on Mobile, Right on Desktop) */}
      <div className="w-full h-[45%] md:h-full md:flex-1 relative order-1 md:order-2">
        <InteractiveMap
          ref={mapRef}
          memories={chronologicalMemories}
          selectedMemory={currentMemory}
          onSelectMemory={(m) => {
            const idx = chronologicalMemories.findIndex((item) => item.id === m.id);
            if (idx !== -1) setCurrentIndex(idx);
          }}
        />
      </div>

      {/* Story Panel with FIXED header and FIXED bottom controls */}
      <div className="w-full h-[55%] md:h-full md:w-[440px] xl:w-[480px] flex flex-col bg-white border-t md:border-t-0 md:border-r border-slate-200 z-20 order-2 md:order-1 shadow-sm">
        {/* 1. FIXED TOP HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Capítulo {currentIndex + 1} de {chronologicalMemories.length}
              </span>
              {stage && (
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <StageIcon name={stage.iconName} className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="truncate max-w-[120px] sm:max-w-none">{stage.title}</span>
                </span>
              )}
            </div>

            {/* Auto Play Button */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-200 transition"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3 h-3 text-amber-600" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-emerald-700 fill-emerald-700" />
                  <span>Reproducir</span>
                </>
              )}
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-amber-400 transition-all duration-500 rounded-full"
              style={{ width: `${((currentIndex + 1) / chronologicalMemories.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 2. SCROLLABLE MIDDLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-start">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMemory.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3 my-auto"
            >
              {mainPhoto && (
                <div
                  onClick={() => onOpenDetail(currentMemory)}
                  className="cursor-pointer group relative aspect-[16/10] w-full rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-slate-100"
                >
                  <img
                    src={mainPhoto}
                    alt={currentMemory.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  <div className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] text-white font-medium flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    <span>{currentMemory.media.length} fotos</span>
                  </div>
                </div>
              )}

              {/* Date & Location */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">
                  {formattedDate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {currentMemory.locationName}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                {currentMemory.title}
              </h2>

              {/* Story */}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {currentMemory.description}
              </p>

              {/* Participants */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {currentMemory.participants.map((p) => (
                    <ParticipantBadge key={p} participant={p} />
                  ))}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  por {currentMemory.createdBy}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 3. STRICTLY FIXED FOOTER CONTROLS (Always visible at bottom) */}
        <div className="p-3.5 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shrink-0 z-30 shadow-lg md:shadow-none">
          <div className="flex items-center justify-between gap-2.5 max-w-md mx-auto w-full">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex-1 py-2.5 px-3 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 border border-slate-200 flex items-center justify-center gap-1 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <button
              onClick={() => onOpenDetail(currentMemory)}
              className="py-2.5 px-4 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-xs font-bold text-emerald-800 border border-slate-200 transition"
            >
              Ver fotos
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === chronologicalMemories.length - 1}
              className="flex-1 py-2.5 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-white flex items-center justify-center gap-1 transition shadow-xs"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
