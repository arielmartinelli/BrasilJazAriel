'use client';

import React from 'react';
import { Memory, STAGES } from '@/lib/types';
import { StageIcon } from '@/components/ui/Icons';
import { MapPin, Camera, Film, Dog } from 'lucide-react';
import { motion } from 'framer-motion';

interface MemoryCardProps {
  memory: Memory;
  onClick: (memory: Memory) => void;
  onFlyTo?: (memory: Memory) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onClick, onFlyTo }) => {
  const stage = STAGES.find((s) => s.id === memory.stageId);
  const photosCount = memory.media.filter((m) => m.type === 'image').length;
  const videosCount = memory.media.filter((m) => m.type === 'video').length;
  const mainImage = memory.media.find((m) => m.type === 'image')?.url || memory.media[0]?.url;
  const hasBruno = memory.participants.includes('Bruno');

  const formattedDate = new Date(memory.date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.article
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
      onClick={() => onClick(memory)}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer group flex flex-col transition-all duration-200 hover:border-emerald-300 hover:shadow-md"
    >
      {/* Photo Header */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {mainImage ? (
          <img
            src={mainImage}
            alt={memory.title}
            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <StageIcon name={stage?.iconName || 'home'} className="w-8 h-8" />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1 pointer-events-none">
          {stage && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/95 text-slate-800 backdrop-blur-xs shadow-xs flex items-center gap-1.5">
              <StageIcon name={stage.iconName} className="w-3 h-3 text-emerald-700" />
              <span className="truncate max-w-[110px]">{stage.title}</span>
            </span>
          )}

          {hasBruno && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-950 shadow-xs flex items-center gap-1">
              <Dog className="w-3 h-3" />
              <span>Bruno</span>
            </span>
          )}
        </div>

        {/* Media Counts */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 pointer-events-none">
          {photosCount > 0 && (
            <div className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span>{photosCount}</span>
            </div>
          )}
          {videosCount > 0 && (
            <div className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1">
              <Film className="w-3 h-3" />
              <span>{videosCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          {/* Date & Author */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-500 text-[11px]">
              {formattedDate}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              por {memory.createdBy}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-base text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
            {memory.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
            {memory.description}
          </p>
        </div>

        {/* Location & Map action */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1 text-emerald-800 truncate text-[11px] font-medium">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span className="truncate">{memory.locationName}</span>
          </div>

          {onFlyTo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFlyTo(memory);
              }}
              title="Centrar en el mapa"
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-emerald-700 transition shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
};
