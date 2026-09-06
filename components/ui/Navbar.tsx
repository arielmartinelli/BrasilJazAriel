'use client';

import React from 'react';
import { Map, BookOpen, LayoutGrid, Plus } from 'lucide-react';
import { ArgBraFlagLogo } from './ArgBraFlagLogo';
import { setActiveUser } from '@/lib/memoryStore';

interface NavbarProps {
  currentView: 'map' | 'story' | 'feed';
  onViewChange: (view: 'map' | 'story' | 'feed') => void;
  onOpenCreate: () => void;
  memoriesCount: number;
  activeUser: 'Ariel' | 'Jazmin';
  onUserChange: (user: 'Ariel' | 'Jazmin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  onOpenCreate,
  memoriesCount,
  activeUser,
  onUserChange,
}) => {
  const toggleUser = () => {
    const nextUser = activeUser === 'Ariel' ? 'Jazmin' : 'Ariel';
    setActiveUser(nextUser);
    onUserChange(nextUser);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand with Argentina-Brasil hybrid logo */}
        <div className="flex items-center gap-3">
          <ArgBraFlagLogo size={36} />
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                Nossa História
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Ariel, Jazmín & Bruno en Brasil
            </p>
          </div>
        </div>

        {/* Desktop View Switcher */}
        <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-full border border-slate-200/80 shadow-xs">
          <button
            onClick={() => onViewChange('map')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentView === 'map'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Mapa</span>
          </button>

          <button
            onClick={() => onViewChange('story')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentView === 'story'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Historia</span>
          </button>

          <button
            onClick={() => onViewChange('feed')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentView === 'feed'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Muro</span>
          </button>
        </nav>

        {/* Desktop Actions */}
        <div className="flex items-center gap-3">
          {/* Active User Toggle */}
          <button
            onClick={toggleUser}
            title="Cambiar quién está publicando"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 transition text-xs font-semibold text-slate-800"
          >
            <span className={`w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-bold ${
              activeUser === 'Ariel' ? 'bg-emerald-600' : 'bg-teal-600'
            }`}>
              {activeUser[0]}
            </span>
            <span>{activeUser}</span>
          </button>

          {/* New Memory Button */}
          <button
            onClick={onOpenCreate}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nuevo recuerdo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
