'use client';

import React from 'react';
import { Map, BookOpen, LayoutGrid, Plus, Cloud, HardDrive, LogOut } from 'lucide-react';
import { ArgBraFlagLogo } from './ArgBraFlagLogo';

export type ViewId = 'map' | 'story' | 'feed';

interface NavbarProps {
  currentView: ViewId;
  onViewChange: (view: ViewId) => void;
  onOpenCreate: () => void;
  memoriesCount: number;
  activeUser: 'Ariel' | 'Jazmin';
  onToggleUser: () => void;
  /** De dónde salen los datos ahora mismo. */
  source: 'supabase' | 'local';
  canSignOut: boolean;
  onSignOut: () => void;
}

const VIEWS: Array<{ id: ViewId; label: string; Icon: typeof Map }> = [
  { id: 'map', label: 'Mapa', Icon: Map },
  { id: 'story', label: 'Historia', Icon: BookOpen },
  { id: 'feed', label: 'Muro', Icon: LayoutGrid },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  onOpenCreate,
  memoriesCount,
  activeUser,
  onToggleUser,
  source,
  canSignOut,
  onSignOut,
}) => {
  const isCloud = source === 'supabase';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <ArgBraFlagLogo size={36} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                Nossa História
              </h1>
              {/* El estado ahora lo informa el servidor, no una variable
                  NEXT_PUBLIC_ que solo decía si existía la clave. */}
              <span
                title={
                  isCloud
                    ? 'Sincronizado en la nube entre los dispositivos de Ariel y Jazmín'
                    : 'Modo local: los recuerdos se guardan solo en este dispositivo'
                }
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  isCloud
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                    : 'border-amber-300 bg-amber-100 text-amber-900'
                }`}
              >
                {isCloud ? <Cloud className="h-3 w-3" aria-hidden /> : <HardDrive className="h-3 w-3" aria-hidden />}
                {isCloud ? 'Nube' : 'Local'}
              </span>
            </div>
            <p className="truncate text-xs font-medium text-slate-500">
              {memoriesCount > 0
                ? `${memoriesCount} ${memoriesCount === 1 ? 'recuerdo guardado' : 'recuerdos guardados'}`
                : 'Ariel, Jazmín & Bruno en Brasil'}
            </p>
          </div>
        </div>

        <nav
          aria-label="Vistas"
          className="hidden items-center rounded-full border border-slate-200 bg-slate-100 p-1 shadow-xs md:flex"
        >
          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onViewChange(id)}
              aria-current={currentView === id ? 'page' : undefined}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                currentView === id
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleUser}
            title="Cambiar quién está publicando"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-200"
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${
                activeUser === 'Ariel' ? 'bg-emerald-600' : 'bg-teal-600'
              }`}
              aria-hidden
            >
              {activeUser[0]}
            </span>
            <span className="hidden sm:inline">{activeUser === 'Jazmin' ? 'Jazmín' : 'Ariel'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreate}
            className="hidden items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 sm:flex"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden />
            Nuevo recuerdo
          </button>

          {canSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              title="Cerrar sesión en este dispositivo"
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 md:flex"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="sr-only">Cerrar sesión</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
