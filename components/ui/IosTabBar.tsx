'use client';

import React from 'react';
import { Map, BookOpen, LayoutGrid, Plus } from 'lucide-react';

interface IosTabBarProps {
  currentView: 'map' | 'story' | 'feed';
  onViewChange: (view: 'map' | 'story' | 'feed') => void;
  onOpenCreate: () => void;
  activeUser: 'Ariel' | 'Jazmin';
  onToggleUser: () => void;
}

export const IosTabBar: React.FC<IosTabBarProps> = ({
  currentView,
  onViewChange,
  onOpenCreate,
  activeUser,
  onToggleUser,
}) => {
  return (
    <div className="md:hidden fixed bottom-4 inset-x-3 z-40 max-w-sm mx-auto pointer-events-none select-none">
      {/* Floating Apple Liquid Capsule Bar */}
      <nav className="pointer-events-auto bg-[#18181b] border border-white/15 rounded-full shadow-[0_14px_40px_rgba(0,0,0,0.38)] p-1.5 px-2 backdrop-blur-2xl">
        <div className="grid grid-cols-5 items-center w-full">
          {/* Tab 1: Mapa */}
          <button
            onClick={() => onViewChange('map')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full transition-all duration-200 ${
              currentView === 'map'
                ? 'text-emerald-400 font-bold bg-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Map className={`w-4 h-4 ${currentView === 'map' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px] tracking-tight font-medium">Mapa</span>
          </button>

          {/* Tab 2: Historia */}
          <button
            onClick={() => onViewChange('story')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full transition-all duration-200 ${
              currentView === 'story'
                ? 'text-emerald-400 font-bold bg-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className={`w-4 h-4 ${currentView === 'story' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px] tracking-tight font-medium">Historia</span>
          </button>

          {/* Center Button: + Recuerdo (Apple Action Floating Button) */}
          <div className="flex items-center justify-center w-full">
            <button
              onClick={onOpenCreate}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 text-slate-950 shadow-md flex items-center justify-center active:scale-90 transition-transform duration-150 border border-white/25"
              aria-label="Nuevo recuerdo"
            >
              <Plus className="w-5 h-5 stroke-[2.8] text-white" />
            </button>
          </div>

          {/* Tab 4: Muro */}
          <button
            onClick={() => onViewChange('feed')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full transition-all duration-200 ${
              currentView === 'feed'
                ? 'text-emerald-400 font-bold bg-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className={`w-4 h-4 ${currentView === 'feed' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px] tracking-tight font-medium">Muro</span>
          </button>

          {/* Tab 5: Autor (celda fija que no desplaza los otros botones) */}
          <button
            onClick={onToggleUser}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full text-slate-300 hover:text-white active:scale-95 transition-all duration-150"
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
              activeUser === 'Ariel' ? 'bg-emerald-600' : 'bg-teal-600'
            }`}>
              {activeUser[0]}
            </div>
            <span className="text-[10px] font-medium w-full text-center truncate px-0.5">
              {activeUser}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};
