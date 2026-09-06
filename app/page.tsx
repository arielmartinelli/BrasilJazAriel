'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Memory, StageId } from '@/lib/types';
import { fetchAllMemories, createMemory, updateMemory, deleteMemory, getActiveUser, setActiveUser } from '@/lib/memoryStore';
import { Navbar } from '@/components/ui/Navbar';
import { IosTabBar } from '@/components/ui/IosTabBar';
import { InteractiveMap, InteractiveMapRef } from '@/components/map/InteractiveMap';
import { MemoryCard } from '@/components/memories/MemoryCard';
import { MemoryFilters } from '@/components/memories/MemoryFilters';
import { MemoryDetailModal } from '@/components/memories/MemoryDetailModal';
import { CreateMemoryModal } from '@/components/memories/CreateMemoryModal';
import { EditMemoryModal } from '@/components/memories/EditMemoryModal';
import { StoryTour } from '@/components/story/StoryTour';
import { RoadTripLoader } from '@/components/ui/RoadTripLoader';
import { Plus, MapPin, ChevronUp, Palmtree, PanelRightClose, PanelRightOpen, Maximize2, ListFilter, Layers } from 'lucide-react';

export default function Home() {
  const [showRoadTripLoader, setShowRoadTripLoader] = useState(true);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [currentView, setCurrentView] = useState<'map' | 'story' | 'feed'>('map');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [detailMemory, setDetailMemory] = useState<Memory | null>(null);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeUser, setActiveUserState] = useState<'Ariel' | 'Jazmin'>('Ariel');
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Filters
  const [selectedStage, setSelectedStage] = useState<StageId | 'all'>('all');
  const [selectedParticipant, setSelectedParticipant] = useState<'all' | 'Ariel' | 'Jazmin' | 'both'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const mapRef = useRef<InteractiveMapRef>(null);

  useEffect(() => {
    async function loadData() {
      const data = await fetchAllMemories();
      setMemories(data);
      if (data.length > 0) {
        setSelectedMemory(data[0]);
      }
      setActiveUserState(getActiveUser());
    }
    loadData();
  }, []);

  const handleUserChange = (user: 'Ariel' | 'Jazmin') => {
    setActiveUserState(user);
    setActiveUser(user);
  };

  const handleToggleUser = () => {
    const nextUser = activeUser === 'Ariel' ? 'Jazmin' : 'Ariel';
    handleUserChange(nextUser);
  };

  const handleSaveNewMemory = async (newMem: Omit<Memory, 'id' | 'createdAt'>) => {
    const created = await createMemory(newMem);
    setMemories((prev) => [created, ...prev]);
    setSelectedMemory(created);
    if (mapRef.current) {
      mapRef.current.flyToMemory(created, 13.5);
    }
  };

  const handleUpdateMemory = async (updated: Memory) => {
    await updateMemory(updated);
    setMemories((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    if (selectedMemory?.id === updated.id) setSelectedMemory(updated);
    if (detailMemory?.id === updated.id) setDetailMemory(updated);
  };

  const handleDeleteMemory = async (id: string) => {
    await deleteMemory(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
    if (selectedMemory?.id === id) setSelectedMemory(null);
    if (detailMemory?.id === id) setDetailMemory(null);
  };

  const handleFlyTo = (mem: Memory) => {
    setSelectedMemory(mem);
    if (currentView !== 'map') {
      setCurrentView('map');
    }
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.flyToMemory(mem, 13.5);
      }
    }, 150);
  };

  const filteredMemories = memories.filter((mem) => {
    if (selectedStage !== 'all' && mem.stageId !== selectedStage) {
      return false;
    }
    if (selectedParticipant === 'Ariel' && mem.createdBy !== 'Ariel') {
      return false;
    }
    if (selectedParticipant === 'Jazmin' && mem.createdBy !== 'Jazmin') {
      return false;
    }
    if (selectedParticipant === 'both' && (!mem.participants.includes('Ariel') || !mem.participants.includes('Jazmin'))) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = mem.title.toLowerCase().includes(q);
      const matchDesc = mem.description.toLowerCase().includes(q);
      const matchLoc = mem.locationName.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchLoc) return false;
    }
    return true;
  });

  return (
    <main className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900 select-none">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v)}
        onOpenCreate={() => setIsCreateModalOpen(true)}
        memoriesCount={memories.length}
        activeUser={activeUser}
        onUserChange={handleUserChange}
      />

      {/* VIEW 1: MAP INTERACTIVE VIEW (Full Height & Full Length) */}
      {currentView === 'map' && (
        <div className="relative flex-1 w-full h-[calc(100dvh-4rem-4.5rem)] md:h-[calc(100vh-4rem)] flex flex-col md:flex-row overflow-hidden">
          {/* Main Map */}
          <div
            className={`relative w-full transition-all duration-300 ${
              isMapExpanded ? 'h-full flex-1' : 'h-[44vh] shrink-0 md:h-full md:flex-1'
            }`}
          >
            <InteractiveMap
              ref={mapRef}
              memories={filteredMemories}
              selectedMemory={selectedMemory}
              onSelectMemory={(m) => {
                setSelectedMemory(m);
                if (mapRef.current) mapRef.current.flyToMemory(m, 13.5);
              }}
            />

            {/* Bottom Toggle Button to Expand or Show List (Visible on both mobile & desktop) */}
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
              <button
                onClick={() => {
                  const next = !isMapExpanded;
                  setIsMapExpanded(next);
                  setTimeout(() => mapRef.current?.resize(), 250);
                }}
                title={isMapExpanded ? "Ver filtros y lista de recuerdos" : "Expandir mapa a pantalla completa"}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/95 text-slate-800 hover:text-slate-950 border border-slate-200 shadow-md backdrop-blur-md text-xs font-semibold active:scale-95 transition"
              >
                {isMapExpanded ? (
                  <>
                    <ListFilter className="w-4 h-4 text-emerald-700" />
                    <span>Ver lista y filtros ({filteredMemories.length})</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-emerald-700" />
                    <span>Expandir mapa</span>
                  </>
                )}
              </button>
            </div>

            {/* Mobile Bottom Selected Memory Card (positioned above floating dock when map is expanded) */}
            {selectedMemory && isMapExpanded && (
              <div className="md:hidden absolute bottom-16 inset-x-3 z-20">
                <div
                  onClick={() => setDetailMemory(selectedMemory)}
                  className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3 shadow-lg flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    <img
                      src={selectedMemory.media[0]?.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold truncate mb-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{selectedMemory.locationName}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {selectedMemory.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {selectedMemory.description}
                    </p>
                  </div>

                  <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                    <ChevronUp className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Bottom Panel: Filters & Memories below the map (Visible when !isMapExpanded) */}
          {!isMapExpanded && (
            <div className="flex md:hidden flex-1 min-h-0 bg-white border-t border-slate-200 flex-col overflow-hidden z-10 shadow-lg">
              {/* Header Bar of Mobile Panel */}
              <div className="p-3 border-b border-slate-100 flex flex-col gap-2 shrink-0 bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Recuerdos ({filteredMemories.length})</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsMapExpanded(true);
                      setTimeout(() => mapRef.current?.resize(), 250);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold active:scale-95 transition shadow-2xs"
                  >
                    <Maximize2 className="w-3 h-3 text-emerald-700" />
                    <span>Expandir mapa</span>
                  </button>
                </div>
                <MemoryFilters
                  selectedStage={selectedStage}
                  onSelectStage={setSelectedStage}
                  selectedParticipant={selectedParticipant}
                  onSelectParticipant={setSelectedParticipant}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  totalCount={filteredMemories.length}
                />
              </div>

              {/* Scrollable list of memories in mobile bottom panel */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                {filteredMemories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 text-xs">
                    <Palmtree className="w-7 h-7 mb-1.5 text-slate-300 stroke-[1.5]" />
                    No hay recuerdos con los filtros seleccionados.
                  </div>
                ) : (
                  filteredMemories.map((mem) => (
                    <MemoryCard
                      key={mem.id}
                      memory={mem}
                      onClick={(m) => setDetailMemory(m)}
                      onFlyTo={(m) => {
                        setSelectedMemory(m);
                        mapRef.current?.flyToMemory(m, 13.5);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Desktop Side Panel (Collapsible) */}
          {!isMapExpanded && (
            <aside className="hidden md:flex flex-col w-[380px] xl:w-[420px] h-full bg-white border-l border-slate-200 z-20 shadow-xs">
              <div className="p-4 border-b border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Recuerdos ({filteredMemories.length})
                  </span>
                  <button
                    onClick={() => {
                      setIsMapExpanded(true);
                      setTimeout(() => mapRef.current?.resize(), 250);
                    }}
                    title="Expandir mapa completo"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Expandir mapa</span>
                  </button>
                </div>
                <MemoryFilters
                  selectedStage={selectedStage}
                  onSelectStage={setSelectedStage}
                  selectedParticipant={selectedParticipant}
                  onSelectParticipant={setSelectedParticipant}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  totalCount={filteredMemories.length}
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5">
                {filteredMemories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 text-xs">
                    <Palmtree className="w-8 h-8 mb-2 text-slate-300 stroke-[1.5]" />
                    No hay recuerdos con los filtros seleccionados.
                  </div>
                ) : (
                  filteredMemories.map((mem) => (
                    <MemoryCard
                      key={mem.id}
                      memory={mem}
                      onClick={(m) => setDetailMemory(m)}
                      onFlyTo={(m) => {
                        setSelectedMemory(m);
                        mapRef.current?.flyToMemory(m, 13.5);
                      }}
                    />
                  ))
                )}
              </div>
            </aside>
          )}
        </div>
      )}

      {/* VIEW 2: SCROLLYTELLING HISTORIA */}
      {currentView === 'story' && (
        <div className="relative flex-1 w-full h-[calc(100dvh-4rem-4.5rem)] md:h-[calc(100vh-4rem)] overflow-hidden">
          <StoryTour
            memories={filteredMemories}
            onOpenDetail={(mem) => setDetailMemory(mem)}
          />
        </div>
      )}

      {/* VIEW 3: WALL / GALLERY FEED VIEW */}
      {currentView === 'feed' && (
        <div className="flex-1 w-full overflow-y-auto pb-20 md:pb-8">
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6">
            {/* Header Banner */}
            <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Álbum Familiar
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                  A Nossa Vida no Brasil
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mt-1 leading-relaxed">
                  Fotos, videos y momentos documentados de nuestra vida en Brasil.
                </p>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nuevo recuerdo</span>
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <MemoryFilters
                selectedStage={selectedStage}
                onSelectStage={setSelectedStage}
                selectedParticipant={selectedParticipant}
                onSelectParticipant={setSelectedParticipant}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                totalCount={filteredMemories.length}
              />
            </div>

            {/* Grid or Empty State */}
            {filteredMemories.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                  <Palmtree className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Tu álbum familiar está listo
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
                  Aún no hay recuerdos guardados. Registra el primer momento del viaje en auto para comenzar a llenar el mapa y la historia.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Registrar primer recuerdo</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {filteredMemories.map((mem) => (
                  <MemoryCard
                    key={mem.id}
                    memory={mem}
                    onClick={(m) => setDetailMemory(m)}
                    onFlyTo={handleFlyTo}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* iOS Bottom Navigation Bar (Mobile) */}
      <IosTabBar
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v)}
        onOpenCreate={() => setIsCreateModalOpen(true)}
        activeUser={activeUser}
        onToggleUser={handleToggleUser}
      />

      {/* Modals */}
      <MemoryDetailModal
        memory={detailMemory}
        onClose={() => setDetailMemory(null)}
        onFlyTo={handleFlyTo}
        onEdit={(m) => {
          setEditingMemory(m);
          setIsEditModalOpen(true);
        }}
        onDelete={handleDeleteMemory}
      />

      <EditMemoryModal
        memory={editingMemory}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingMemory(null);
        }}
        onUpdate={handleUpdateMemory}
      />

      <CreateMemoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveNewMemory}
        activeUser={activeUser}
      />

      {/* Dynamic Road Trip Animated Loading Screen (CBA ➔ Brasil ~5s) */}
      {showRoadTripLoader && (
        <RoadTripLoader
          durationMs={5000}
          onComplete={() => setShowRoadTripLoader(false)}
        />
      )}
    </main>
  );
}
