'use client';

import React from 'react';
import { STAGES, StageId } from '@/lib/types';
import { StageIcon } from '@/components/ui/Icons';
import { Search, User, ChevronDown } from 'lucide-react';

interface MemoryFiltersProps {
  selectedStage: StageId | 'all';
  onSelectStage: (stage: StageId | 'all') => void;
  selectedParticipant: 'all' | 'Ariel' | 'Jazmin' | 'both';
  onSelectParticipant: (p: 'all' | 'Ariel' | 'Jazmin' | 'both') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalCount: number;
}

export const MemoryFilters: React.FC<MemoryFiltersProps> = ({
  selectedStage,
  onSelectStage,
  selectedParticipant,
  onSelectParticipant,
  searchQuery,
  onSearchChange,
  totalCount,
}) => {
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Search Input & Dropdown Author Row */}
      <div className="flex items-center gap-2 w-full">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar momento o playa..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
          />
        </div>

        {/* Author Dropdown Select (Compact, no horizontal scroll) */}
        <div className="relative shrink-0">
          <div className="flex items-center gap-1.5 pl-2.5 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 hover:border-slate-300 transition cursor-pointer">
            <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <select
              value={selectedParticipant}
              onChange={(e) => onSelectParticipant(e.target.value as 'all' | 'Ariel' | 'Jazmin' | 'both')}
              className="appearance-none bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">Todos</option>
              <option value="Ariel">Ariel</option>
              <option value="Jazmin">Jazmín</option>
              <option value="both">Ambos</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Stage Pills (with hidden scrollbar on Windows) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => onSelectStage('all')}
          className={`px-3 py-1 rounded-full font-semibold transition shrink-0 flex items-center gap-1.5 border ${
            selectedStage === 'all'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span>Todos ({totalCount})</span>
        </button>

        {STAGES.map((stage) => {
          const isSelected = selectedStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => onSelectStage(stage.id)}
              className={`px-3 py-1 rounded-full font-semibold transition shrink-0 flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <StageIcon name={stage.iconName} className="w-3.5 h-3.5 text-emerald-700" />
              <span>{stage.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
