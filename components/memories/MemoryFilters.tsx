'use client';

import React from 'react';
import { STAGES, StageId } from '@/lib/types';
import { StageIcon } from '@/components/ui/Icons';
import { Search, User, ChevronDown, Dog, ArrowDownUp, X } from 'lucide-react';

export type AuthorFilter = 'all' | 'Ariel' | 'Jazmin' | 'both';
export type SortOrder = 'recent' | 'oldest';

interface MemoryFiltersProps {
  selectedStage: StageId | 'all';
  onSelectStage: (stage: StageId | 'all') => void;
  selectedParticipant: AuthorFilter;
  onSelectParticipant: (value: AuthorFilter) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onlyBruno: boolean;
  onToggleBruno: () => void;
  sortOrder: SortOrder;
  onSortChange: (value: SortOrder) => void;
  totalCount: number;
  /** Cuántos recuerdos hay por etapa, para mostrarlo en cada pastilla. */
  stageCounts: Record<string, number>;
  onClearFilters: () => void;
}

export const MemoryFilters: React.FC<MemoryFiltersProps> = ({
  selectedStage,
  onSelectStage,
  selectedParticipant,
  onSelectParticipant,
  searchQuery,
  onSearchChange,
  onlyBruno,
  onToggleBruno,
  sortOrder,
  onSortChange,
  totalCount,
  stageCounts,
  onClearFilters,
}) => {
  const hasActiveFilters =
    selectedStage !== 'all' ||
    selectedParticipant !== 'all' ||
    onlyBruno ||
    searchQuery.trim().length > 0;

  return (
    <div className="flex w-full max-w-full flex-col gap-2.5 overflow-x-hidden">
      {/* Buscador + autor */}
      <div className="flex w-full items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <label htmlFor="memory-search" className="sr-only-focusable">
            Buscar recuerdos
          </label>
          <input
            id="memory-search"
            type="search"
            placeholder="Buscar momento, playa o anécdota…"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-600 focus:bg-white"
          />
        </div>

        <div className="relative shrink-0">
          <label htmlFor="author-filter" className="sr-only-focusable">
            Filtrar por autor
          </label>
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 py-2 pl-2.5 pr-7 text-sm font-semibold text-slate-800 transition hover:border-slate-400">
            <User className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
            <select
              id="author-filter"
              value={selectedParticipant}
              onChange={(event) => onSelectParticipant(event.target.value as AuthorFilter)}
              className="cursor-pointer appearance-none bg-transparent pr-1 text-sm font-semibold text-slate-800 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="Ariel">Ariel</option>
              <option value="Jazmin">Jazmín</option>
              <option value="both">Ambos juntos</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
          </div>
        </div>
      </div>

      {/* Bruno + orden + limpiar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* El README prometía este filtro desde el principio; ahora existe. */}
        <button
          type="button"
          onClick={onToggleBruno}
          aria-pressed={onlyBruno}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
            onlyBruno
              ? 'border-amber-500 bg-amber-400 text-amber-950 shadow-sm'
              : 'border-slate-300 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-800'
          }`}
        >
          <Dog className="h-3.5 w-3.5" aria-hidden />
          <span>Solo con Bruno</span>
        </button>

        <div className="relative shrink-0">
          <label htmlFor="sort-order" className="sr-only-focusable">
            Ordenar recuerdos
          </label>
          <div className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white py-1.5 pl-3 pr-6 text-xs font-semibold text-slate-700">
            <ArrowDownUp className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
            <select
              id="sort-order"
              value={sortOrder}
              onChange={(event) => onSortChange(event.target.value as SortOrder)}
              className="cursor-pointer appearance-none bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="recent">Más recientes</option>
              <option value="oldest">Cronológico</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Etapas */}
      <div
        className="flex flex-wrap items-center gap-1.5 pb-1"
        role="group"
        aria-label="Filtrar por etapa"
      >
        <button
          type="button"
          onClick={() => onSelectStage('all')}
          aria-pressed={selectedStage === 'all'}
          className={`shrink-0 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
            selectedStage === 'all'
              ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
              : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
          }`}
        >
          Todas ({totalCount})
        </button>

        {STAGES.map((stage) => {
          const isSelected = selectedStage === stage.id;
          const count = stageCounts[stage.id] ?? 0;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => onSelectStage(stage.id)}
              aria-pressed={isSelected}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition ${
                isSelected
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : count === 0
                    ? 'border-slate-200 bg-white text-slate-400'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              <StageIcon
                name={stage.iconName}
                className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`}
              />
              <span>{stage.title}</span>
              <span className={isSelected ? 'text-emerald-200' : 'text-slate-400'}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
