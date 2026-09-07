'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, MapPin, ChevronUp, Palmtree, Maximize2, ListFilter, Layers,
  LayoutGrid, GitCommitVertical, AlertTriangle,
} from 'lucide-react';

import { Memory, StageId } from '@/lib/types';
import {
  fetchAllMemories, fetchMemoriesVersion, createMemory, updateMemory, deleteMemory,
  getActiveUser, setActiveUser, fetchSessionState, signOut,
  type Source,
} from '@/lib/memoryStore';
import { sortChronologically } from '@/lib/stats';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { showErrorAlert } from '@/lib/alerts';
import { safeImageSrc, thumbUrl } from '@/lib/media';

import { Navbar, type ViewId } from '@/components/ui/Navbar';
import { IosTabBar } from '@/components/ui/IosTabBar';
import { AccessGate } from '@/components/ui/AccessGate';
import { RoadTripLoader } from '@/components/ui/RoadTripLoader';
import { InteractiveMap, InteractiveMapRef } from '@/components/map/InteractiveMap';
import { MemoryCard } from '@/components/memories/MemoryCard';
import { MemoryTimeline } from '@/components/memories/MemoryTimeline';
import { MemoryFilters, type AuthorFilter, type SortOrder } from '@/components/memories/MemoryFilters';
import { MemoryDetailModal } from '@/components/memories/MemoryDetailModal';
import { MemoryFormModal } from '@/components/memories/MemoryFormModal';
import { StoryTour } from '@/components/story/StoryTour';
import { TripStats } from '@/components/stats/TripStats';

// Sondeo de la firma del album. Es una consulta minima (conteo + fecha de la
// ultima edicion), asi que 5 s se siente instantaneo sin costar casi nada.
const SYNC_INTERVAL_MS = 5_000;

export default function Home() {
  // ---------------------------------------------------------------- estado
  const [showLoader, setShowLoader] = useState(true);
  const [isBooting, setIsBooting] = useState(true);
  const [needsAccessCode, setNeedsAccessCode] = useState(false);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [source, setSource] = useState<Source>('local');
  const [gateEnabled, setGateEnabled] = useState(false);

  const [currentView, setCurrentView] = useState<ViewId>('map');
  const [feedLayout, setFeedLayout] = useState<'grid' | 'timeline'>('grid');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [detailMemory, setDetailMemory] = useState<Memory | null>(null);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeUser, setActiveUserState] = useState<'Ariel' | 'Jazmin'>('Ariel');
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Filtros
  const [selectedStage, setSelectedStage] = useState<StageId | 'all'>('all');
  const [selectedParticipant, setSelectedParticipant] = useState<AuthorFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [onlyBruno, setOnlyBruno] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');

  // Escribir en cada tecla re-renderizaba mapa y lista completos.
  const searchQuery = useDebouncedValue(searchInput, 220);
  const mapRef = useRef<InteractiveMapRef>(null);

  // ------------------------------------------------------------ carga inicial
  const load = useCallback(async () => {
    const result = await fetchAllMemories();
    if (result.unauthorized) {
      setNeedsAccessCode(true);
      return;
    }
    setNeedsAccessCode(false);
    setMemories(result.memories);
    setSource(result.source);
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      const session = await fetchSessionState();
      if (!alive) return;
      setGateEnabled(session.gateEnabled);

      if (session.gateEnabled && !session.authenticated) {
        setNeedsAccessCode(true);
        setIsBooting(false);
        return;
      }

      await load();
      if (!alive) return;
      setActiveUserState(getActiveUser());
      setIsBooting(false);
    })();

    return () => { alive = false; };
  }, [load]);

  // ------------------------------------------------- sincronización en vivo
  useEffect(() => {
    // En modo local no hay nada que sincronizar: los datos no salen del equipo.
    if (source !== 'supabase' || needsAccessCode) return;

    // Se guarda en un ref y no en estado: cambiarlo no debe re-renderizar
    // ni volver a montar el intervalo.
    let lastVersion: string | null = null;
    let inFlight = false;

    const sync = async () => {
      // Con la pestaña en segundo plano no se consulta nada. Antes el sondeo
      // corría igual aunque nadie estuviera mirando.
      if (document.visibilityState !== 'visible' || inFlight) return;

      inFlight = true;
      try {
        const version = await fetchMemoriesVersion();
        // null = no se pudo consultar. No se interpreta como "sin cambios",
        // pero tampoco se baja el álbum entero por las dudas.
        if (version === null || version === lastVersion) return;

        const isFirstCheck = lastVersion === null;
        lastVersion = version;
        if (isFirstCheck) return; // la carga inicial ya trajo los datos

        const result = await fetchAllMemories();
        if (result.unauthorized) {
          setNeedsAccessCode(true);
          return;
        }
        setMemories(result.memories);
      } finally {
        inFlight = false;
      }
    };

    void sync(); // toma la firma inicial
    const timer = window.setInterval(sync, SYNC_INTERVAL_MS);

    // Al volver a la pestaña se comprueba enseguida, sin esperar el intervalo.
    const onVisible = () => { if (document.visibilityState === 'visible') void sync(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [source, needsAccessCode]);

  // ------------------------------------------------------- enlaces ?memory=
  // El botón "Compartir" generaba links /?memory=id que nadie leía: abrías el
  // enlace y caías en el mapa general. Ahora abre ese recuerdo directamente.
  const [pendingMemoryId, setPendingMemoryId] = useState<string | null>(() =>
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('memory')
  );
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null);

  if (pendingMemoryId && memories.length > 0) {
    const found = memories.find((memory) => memory.id === pendingMemoryId) ?? null;
    setPendingMemoryId(null);
    if (found) {
      setSelectedMemory(found);
      setDetailMemory(found);
      setLinkTargetId(found.id);
    }
  }

  const hasFlownToLink = useRef(false);
  useEffect(() => {
    if (!linkTargetId || hasFlownToLink.current) return;
    hasFlownToLink.current = true;

    // Solo habla con el mapa (sistema externo); no toca estado de React.
    const timer = window.setTimeout(() => {
      const target = memories.find((memory) => memory.id === linkTargetId);
      if (target) mapRef.current?.flyToMemory(target, 13.5);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [linkTargetId, memories]);

  // --------------------------------------------------------------- acciones
  const handleToggleUser = useCallback(() => {
    setActiveUserState((current) => {
      const next = current === 'Ariel' ? 'Jazmin' : 'Ariel';
      setActiveUser(next);
      return next;
    });
  }, []);


  const handleSubmitMemory = useCallback(
    async (draft: Omit<Memory, 'id' | 'createdAt'>) => {
      if (editingMemory) {
        const updated = await updateMemory({ ...editingMemory, ...draft }, source);
        setMemories((current) => current.map((m) => (m.id === updated.id ? updated : m)));
        setSelectedMemory((current) => (current?.id === updated.id ? updated : current));
        setDetailMemory((current) => (current?.id === updated.id ? updated : current));
        return;
      }

      const created = await createMemory(draft, source);
      setMemories((current) => [created, ...current]);
      setSelectedMemory(created);
      window.setTimeout(() => mapRef.current?.flyToMemory(created, 13.5), 120);
    },
    [editingMemory, source]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const backup = memories;
      // Actualización optimista: la UI responde al instante y, si el servidor
      // falla, se revierte y se avisa (antes se borraba local aunque fallara).
      setMemories((current) => current.filter((m) => m.id !== id));
      setSelectedMemory((current) => (current?.id === id ? null : current));
      setDetailMemory((current) => (current?.id === id ? null : current));

      try {
        await deleteMemory(id, source);
      } catch (error) {
        setMemories(backup);
        showErrorAlert(
          'No se pudo eliminar',
          error instanceof Error ? error.message : 'Intentá de nuevo en un momento.'
        );
      }
    },
    [memories, source]
  );

  const handleFlyTo = useCallback((memory: Memory) => {
    setSelectedMemory(memory);
    setCurrentView('map');
    window.setTimeout(() => mapRef.current?.flyToMemory(memory, 13.5), 160);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingMemory(null);
    setIsFormOpen(true);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setNeedsAccessCode(true);
    setMemories([]);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedStage('all');
    setSelectedParticipant('all');
    setSearchInput('');
    setOnlyBruno(false);
  }, []);

  // ---------------------------------------------------------------- filtrado
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const memory of memories) {
      counts[memory.stageId] = (counts[memory.stageId] ?? 0) + 1;
    }
    return counts;
  }, [memories]);

  const filteredMemories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const result = memories.filter((memory) => {
      if (selectedStage !== 'all' && memory.stageId !== selectedStage) return false;
      if (onlyBruno && !memory.participants.includes('Bruno')) return false;

      if (selectedParticipant === 'Ariel' && memory.createdBy !== 'Ariel') return false;
      if (selectedParticipant === 'Jazmin' && memory.createdBy !== 'Jazmin') return false;
      if (
        selectedParticipant === 'both' &&
        !(memory.participants.includes('Ariel') && memory.participants.includes('Jazmin'))
      ) {
        return false;
      }

      if (query) {
        const haystack = `${memory.title} ${memory.description} ${memory.locationName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const chronological = sortChronologically(result);
    return sortOrder === 'oldest' ? chronological : chronological.reverse();
  }, [memories, selectedStage, selectedParticipant, onlyBruno, searchQuery, sortOrder]);

  const filtersNode = (
    <MemoryFilters
      selectedStage={selectedStage}
      onSelectStage={setSelectedStage}
      selectedParticipant={selectedParticipant}
      onSelectParticipant={setSelectedParticipant}
      searchQuery={searchInput}
      onSearchChange={setSearchInput}
      onlyBruno={onlyBruno}
      onToggleBruno={() => setOnlyBruno((value) => !value)}
      sortOrder={sortOrder}
      onSortChange={setSortOrder}
      totalCount={memories.length}
      stageCounts={stageCounts}
      onClearFilters={clearFilters}
    />
  );

  const emptyState = (compact = false) => (
    <div className={`flex flex-col items-center justify-center text-center text-slate-400 ${compact ? 'py-8' : 'py-16'}`}>
      <Palmtree className={`mb-2 stroke-[1.5] text-slate-300 ${compact ? 'h-7 w-7' : 'h-9 w-9'}`} aria-hidden />
      <p className="text-sm">No hay recuerdos con estos filtros.</p>
      <button
        type="button"
        onClick={clearFilters}
        className="mt-2 text-sm font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
      >
        Limpiar filtros
      </button>
    </div>
  );

  // ----------------------------------------------------------------- render
  if (needsAccessCode) {
    return (
      <AccessGate
        onUnlocked={() => {
          setNeedsAccessCode(false);
          setIsBooting(true);
          void load().finally(() => {
            setActiveUserState(getActiveUser());
            setIsBooting(false);
          });
        }}
      />
    );
  }

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-slate-50 text-slate-900">
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenCreate={handleOpenCreate}
        memoriesCount={memories.length}
        activeUser={activeUser}
        onToggleUser={handleToggleUser}
        source={source}
        canSignOut={gateEnabled}
        onSignOut={handleSignOut}
      />

      {source === 'local' && !isBooting && (
        <p className="flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Modo local: los recuerdos se guardan solo en este dispositivo y no se sincronizan.
        </p>
      )}

      <div id="contenido" className="flex min-h-0 flex-1 flex-col">
        {/* ------------------------------------------------------- VISTA MAPA */}
        {currentView === 'map' && (
          <div className="relative flex w-full flex-1 flex-col overflow-hidden md:flex-row">
            <div
              className={`relative w-full transition-all duration-300 ${
                isMapExpanded ? 'h-full flex-1' : 'h-[44dvh] shrink-0 md:h-full md:flex-1'
              }`}
            >
              <InteractiveMap
                ref={mapRef}
                memories={filteredMemories}
                selectedMemory={selectedMemory}
                centerOnUserOnLoad
                onSelectMemory={(memory) => {
                  setSelectedMemory(memory);
                  mapRef.current?.flyToMemory(memory, 13.5);
                }}
              />

              <div className="absolute bottom-6 left-6 z-20 hidden md:flex">
                <button
                  type="button"
                  onClick={() => {
                    setIsMapExpanded((value) => !value);
                    window.setTimeout(() => mapRef.current?.resize(), 260);
                  }}
                  className="flex items-center gap-2 rounded-full border-2 border-emerald-500/60 bg-slate-900/95 px-5 py-2.5 text-xs font-bold text-white shadow-2xl backdrop-blur-md transition hover:scale-105 hover:bg-slate-900 active:scale-95"
                >
                  {isMapExpanded ? (
                    <>
                      <ListFilter className="h-4 w-4 text-emerald-400" aria-hidden />
                      Mostrar lista y filtros ({filteredMemories.length})
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-4 w-4 text-emerald-400" aria-hidden />
                      Expandir mapa completo
                    </>
                  )}
                </button>
              </div>

              {isMapExpanded ? (
                <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 md:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMapExpanded(false);
                      window.setTimeout(() => mapRef.current?.resize(), 260);
                    }}
                    className="flex items-center gap-2 rounded-full border-2 border-emerald-400 bg-slate-950 px-5 py-2.5 text-xs font-extrabold text-white shadow-2xl backdrop-blur-md transition active:scale-95"
                  >
                    <ListFilter className="h-4 w-4 text-emerald-400" aria-hidden />
                    Ver recuerdos ({filteredMemories.length})
                  </button>
                </div>
              ) : (
                <div className="absolute bottom-3 right-3 z-20 md:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMapExpanded(true);
                      window.setTimeout(() => mapRef.current?.resize(), 260);
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-slate-900/90 px-3.5 py-2 text-xs font-bold text-white shadow-lg transition active:scale-95"
                  >
                    <Maximize2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                    Expandir mapa
                  </button>
                </div>
              )}

              {selectedMemory && isMapExpanded && (
                <div className="absolute inset-x-3 bottom-38 z-20 md:hidden">
                  <button
                    type="button"
                    onClick={() => setDetailMemory(selectedMemory)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 text-left shadow-lg backdrop-blur-md"
                  >
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {selectedMemory.media[0] && (
                        <img
                          src={safeImageSrc(thumbUrl(selectedMemory.media[0].url, { width: 112, height: 112 }))}
                          alt=""
                          width={112}
                          height={112}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-0.5 flex items-center gap-1 truncate text-xs font-bold text-emerald-700">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{selectedMemory.locationName}</span>
                      </span>
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {selectedMemory.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {selectedMemory.description}
                      </span>
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                      <ChevronUp className="h-4 w-4" aria-hidden />
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Panel inferior (móvil) */}
            {!isMapExpanded && (
              <section className="z-10 flex min-h-0 flex-1 flex-col overflow-hidden border-t border-slate-200 bg-white shadow-lg md:hidden">
                <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                      <Layers className="h-4 w-4 text-emerald-700" aria-hidden />
                      Recuerdos ({filteredMemories.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMapExpanded(true);
                        window.setTimeout(() => mapRef.current?.resize(), 260);
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                    >
                      <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                      Expandir mapa
                    </button>
                  </div>
                  {filtersNode}
                </div>

                <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 pb-28">
                  {filteredMemories.length === 0
                    ? emptyState(true)
                    : filteredMemories.map((memory, index) => (
                        <MemoryCard
                          key={memory.id}
                          memory={memory}
                          priority={index < 2}
                          onClick={setDetailMemory}
                          onFlyTo={(item) => {
                            setSelectedMemory(item);
                            mapRef.current?.flyToMemory(item, 13.5);
                          }}
                        />
                      ))}
                </div>
              </section>
            )}

            {/* Panel lateral (escritorio) */}
            {!isMapExpanded && (
              <aside className="z-20 hidden h-full w-[380px] flex-col border-l border-slate-200 bg-white shadow-xs md:flex xl:w-[420px]">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Recuerdos ({filteredMemories.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMapExpanded(true);
                        window.setTimeout(() => mapRef.current?.resize(), 260);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                    >
                      <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                      Expandir mapa
                    </button>
                  </div>
                  {filtersNode}
                </div>

                <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4">
                  {filteredMemories.length === 0
                    ? emptyState()
                    : filteredMemories.map((memory, index) => (
                        <MemoryCard
                          key={memory.id}
                          memory={memory}
                          priority={index < 3}
                          onClick={setDetailMemory}
                          onFlyTo={(item) => {
                            setSelectedMemory(item);
                            mapRef.current?.flyToMemory(item, 13.5);
                          }}
                        />
                      ))}
                </div>
              </aside>
            )}
          </div>
        )}

        {/* --------------------------------------------------- VISTA HISTORIA */}
        {currentView === 'story' && (
          <div className="relative w-full flex-1 overflow-hidden">
            <StoryTour memories={filteredMemories} onOpenDetail={setDetailMemory} />
          </div>
        )}

        {/* ------------------------------------------------------- VISTA MURO */}
        {currentView === 'feed' && (
          <div className="w-full flex-1 overflow-y-auto pb-28 md:pb-8">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
              <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:p-8">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Álbum familiar
                  </span>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                    A Nossa Vida no Brasil
                  </h2>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-emerald-100">
                    Fotos, videos y momentos documentados de nuestra vida en Brasil.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-300 active:scale-95"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden />
                  Nuevo recuerdo
                </button>
              </div>

              {/* Panel de estadísticas del viaje */}
              <TripStats memories={memories} />

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">{filtersNode}</div>

              {filteredMemories.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
                  <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Palmtree className="h-8 w-8" aria-hidden />
                  </span>
                  <h3 className="mb-1.5 text-lg font-bold text-slate-900">
                    {memories.length === 0 ? 'Tu álbum familiar está listo' : 'Nada con estos filtros'}
                  </h3>
                  <p className="mb-6 max-w-sm text-sm leading-relaxed text-slate-500">
                    {memories.length === 0
                      ? 'Todavía no hay recuerdos guardados. Registrá el primer momento del viaje en auto para empezar a llenar el mapa y la historia.'
                      : 'Probá quitando algún filtro para ver más momentos.'}
                  </p>
                  <button
                    type="button"
                    onClick={memories.length === 0 ? handleOpenCreate : clearFilters}
                    className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    {memories.length === 0 ? (
                      <><Plus className="h-4 w-4 stroke-[2.5]" aria-hidden /> Registrar primer recuerdo</>
                    ) : (
                      'Limpiar filtros'
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {/* Grilla o línea de tiempo */}
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-600">
                      {filteredMemories.length}{' '}
                      {filteredMemories.length === 1 ? 'recuerdo' : 'recuerdos'}
                    </p>
                    <div
                      role="group"
                      aria-label="Forma de ver el álbum"
                      className="flex items-center rounded-full border border-slate-200 bg-white p-1"
                    >
                      <button
                        type="button"
                        onClick={() => setFeedLayout('grid')}
                        aria-pressed={feedLayout === 'grid'}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          feedLayout === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                        Grilla
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedLayout('timeline')}
                        aria-pressed={feedLayout === 'timeline'}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          feedLayout === 'timeline' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <GitCommitVertical className="h-3.5 w-3.5" aria-hidden />
                        Línea de tiempo
                      </button>
                    </div>
                  </div>

                  {feedLayout === 'grid' ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                      {filteredMemories.map((memory, index) => (
                        <MemoryCard
                          key={memory.id}
                          memory={memory}
                          priority={index < 3}
                          onClick={setDetailMemory}
                          onFlyTo={handleFlyTo}
                        />
                      ))}
                    </div>
                  ) : (
                    <MemoryTimeline
                      memories={filteredMemories}
                      onOpen={setDetailMemory}
                      onFlyTo={handleFlyTo}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <IosTabBar
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenCreate={handleOpenCreate}
        activeUser={activeUser}
        onToggleUser={handleToggleUser}
      />

      <MemoryDetailModal
        memory={detailMemory}
        onClose={() => setDetailMemory(null)}
        onFlyTo={handleFlyTo}
        onEdit={(memory) => {
          setEditingMemory(memory);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
      />

      <MemoryFormModal
        isOpen={isFormOpen}
        memory={editingMemory}
        activeUser={activeUser}
        onClose={() => {
          setIsFormOpen(false);
          setEditingMemory(null);
        }}
        onSubmit={handleSubmitMemory}
      />

      {showLoader && <RoadTripLoader durationMs={5000} onComplete={() => setShowLoader(false)} />}
    </main>
  );
}
