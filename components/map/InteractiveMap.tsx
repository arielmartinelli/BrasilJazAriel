'use client';

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from 'react';
import { Memory } from '@/lib/types';
import { Compass, Layers, ZoomIn, ZoomOut, Navigation, Maximize } from 'lucide-react';
import type * as LeafletType from 'leaflet';
import { getAccurateCurrentPosition } from '@/lib/geoUtils';
import { showErrorAlert } from '@/lib/alerts';

export interface InteractiveMapRef {
  flyToMemory: (memory: Memory, customZoom?: number) => void;
  resetView: () => void;
  fitAll: () => void;
  resize: () => void;
}

interface InteractiveMapProps {
  memories: Memory[];
  selectedMemory: Memory | null;
  onSelectMemory: (memory: Memory) => void;
  className?: string;
  enableClustering?: boolean;
  showRouteByDefault?: boolean;
  centerOnUserOnLoad?: boolean;
}

// Proveedores de tiles 100% gratuitos y confiables, sin API key ni marcas de agua
const TILE_LAYERS = [
  {
    id: 'osm',
    name: 'Calles & Playas',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  },
  {
    id: 'esri',
    name: 'Topografía & Relieve',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    subdomains: [] as string[],
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri',
  },
];

// Coordenadas por defecto (Florianópolis): [lat, lng]
const DEFAULT_CENTER: [number, number] = [-27.6000, -48.5496];
const DEFAULT_ZOOM = 10;

export const InteractiveMap = forwardRef<InteractiveMapRef, InteractiveMapProps>(
  (
    {
      memories,
      selectedMemory,
      onSelectMemory,
      className = '',
      centerOnUserOnLoad = true,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletType.Map | null>(null);
    const currentTileLayerRef = useRef<LeafletType.TileLayer | null>(null);
    const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);
    const LRef = useRef<typeof LeafletType | null>(null);
    const userMarkerRef = useRef<LeafletType.Marker | null>(null);
    const hasAutoLocatedRef = useRef(false);

    const [selectedTileIdx, setSelectedTileIdx] = useState(0);
    const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    useImperativeHandle(ref, () => ({
      flyToMemory: (memory: Memory, customZoom = 13.5) => {
        if (!mapRef.current || !memory?.coordinates) return;
        const [lng, lat] = memory.coordinates;
        if (isNaN(lat) || isNaN(lng)) return;
        mapRef.current.flyTo([lat, lng], customZoom, {
          duration: 1.2,
          easeLinearity: 0.2,
        });
      },
      resetView: () => {
        if (!mapRef.current) return;
        mapRef.current.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1 });
      },
      fitAll: () => {
        const map = mapRef.current;
        const L = LRef.current;
        if (!map || !L || memories.length === 0) return;
        const validCoords = memories
          .filter((m) => m?.coordinates && !isNaN(m.coordinates[0]) && !isNaN(m.coordinates[1]))
          .map((m) => [m.coordinates[1], m.coordinates[0]] as [number, number]);
        if (validCoords.length === 0) return;
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [56, 56], maxZoom: 14 });
      },
      resize: () => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      },
    }));

    // Inicializar mapa de Leaflet
    useEffect(() => {
      let isMounted = true;
      const containerNode = containerRef.current;

      async function initLeaflet() {
        if (!containerNode || mapRef.current) return;

        // Limpiar _leaflet_id previo para evitar 'Map container is already initialized'
        if ((containerNode as unknown as { _leaflet_id?: number })._leaflet_id) {
          delete (containerNode as unknown as { _leaflet_id?: number })._leaflet_id;
        }

        try {
          const L = (await import('leaflet')).default;
          LRef.current = L;

          if (!isMounted || !containerNode) return;

          const map = L.map(containerNode, {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            zoomControl: false,
            attributionControl: false,
          });

          // Capa de mosaicos inicial
          const tileConfig = TILE_LAYERS[0];
          const tileLayer = L.tileLayer(tileConfig.url, {
            subdomains: tileConfig.subdomains,
            maxZoom: tileConfig.maxZoom,
            attribution: tileConfig.attribution,
          }).addTo(map);

          currentTileLayerRef.current = tileLayer;

          const markersLayer = L.layerGroup().addTo(map);
          markersLayerRef.current = markersLayer;
          mapRef.current = map;
          setMapReady(true);

          // Invalidate size en intervalos para adaptarse a renders y animaciones
          map.invalidateSize();
          setTimeout(() => { if (isMounted && mapRef.current) mapRef.current.invalidateSize(); }, 120);
          setTimeout(() => { if (isMounted && mapRef.current) mapRef.current.invalidateSize(); }, 350);
          setTimeout(() => { if (isMounted && mapRef.current) mapRef.current.invalidateSize(); }, 700);

          if (centerOnUserOnLoad && !hasAutoLocatedRef.current) {
            hasAutoLocatedRef.current = true;
            void autoLocateUser(map, L);
          }
        } catch (err) {
          console.error('Error inicializando mapa:', err);
        }
      }

      async function autoLocateUser(map: LeafletType.Map, L: typeof LeafletType) {
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('memory')) {
          return;
        }

        // 1. Centrado rápido por IP de Vercel (< 100ms, sin diálogo de permisos)
        try {
          const res = await fetch('/api/locate');
          if (res.ok && isMounted && mapRef.current) {
            const data = await res.json();
            if (data?.coords && Array.isArray(data.coords) && data.source === 'vercel') {
              const [ipLng, ipLat] = data.coords;
              if (!isNaN(ipLat) && !isNaN(ipLng)) {
                map.flyTo([ipLat, ipLng], 12, { duration: 1 });
              }
            }
          }
        } catch {
          // Continuar al GPS de dispositivo
        }

        // 2. Localización GPS de alta precisión con timeout optimizado
        try {
          const pos = await getAccurateCurrentPosition({ timeoutMs: 3500, maximumAgeMs: 180000 });
          if (!isMounted || !mapRef.current) return;

          map.flyTo([pos[1], pos[0]], 13.5, { duration: 1.2 });

          const iconHtml = `
            <div class="relative flex items-center justify-center">
              <div class="w-6 h-6 rounded-full bg-sky-500 border-2 border-white shadow-lg animate-pulse"></div>
              <div class="absolute -inset-1 rounded-full bg-sky-400 opacity-30 animate-ping"></div>
            </div>
          `;
          const icon = L.divIcon({
            html: iconHtml,
            className: 'user-loc-pin',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker([pos[1], pos[0]], { icon, title: 'Tu ubicación actual' }).addTo(map);
          } else {
            userMarkerRef.current.setLatLng([pos[1], pos[0]]);
          }
        } catch {
          // Si el usuario deniega el permiso o no hay GPS, se conserva la posición previa sin error
        }
      }

      initLeaflet();

      // Observador de cambios de tamaño del contenedor para reajustar Leaflet automáticamente
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && containerNode) {
        resizeObserver = new ResizeObserver(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(containerNode);
      }

      const handleResize = () => {
        if (mapRef.current) mapRef.current.invalidateSize();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        isMounted = false;
        window.removeEventListener('resize', handleResize);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        if (containerNode && (containerNode as unknown as { _leaflet_id?: number })._leaflet_id) {
          delete (containerNode as unknown as { _leaflet_id?: number })._leaflet_id;
        }
        markersLayerRef.current = null;
        userMarkerRef.current = null;
        setMapReady(false);
      };
    }, [centerOnUserOnLoad]);

    // Cambiar capa de mapa
    const changeTileLayer = useCallback((idx: number) => {
      if (!mapRef.current || !LRef.current) return;
      const L = LRef.current;
      if (currentTileLayerRef.current) {
        mapRef.current.removeLayer(currentTileLayerRef.current);
      }
      const newConfig = TILE_LAYERS[idx];
      const newLayer = L.tileLayer(newConfig.url, {
        subdomains: newConfig.subdomains,
        maxZoom: newConfig.maxZoom,
        attribution: newConfig.attribution,
      }).addTo(mapRef.current);
      currentTileLayerRef.current = newLayer;
      setSelectedTileIdx(idx);
      setIsLayerMenuOpen(false);
    }, []);

    // Actualizar pines
    useEffect(() => {
      if (!mapRef.current || !markersLayerRef.current || !LRef.current) return;

      const L = LRef.current;
      const markersLayer = markersLayerRef.current;
      markersLayer.clearLayers();

      memories.forEach((mem) => {
        if (!mem || !mem.coordinates || !Array.isArray(mem.coordinates) || mem.coordinates.length < 2) {
          return;
        }

        const lng = Number(mem.coordinates[0]);
        const lat = Number(mem.coordinates[1]);
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return;
        }

        const isSelected = selectedMemory?.id === mem.id;
        const firstPhoto = Array.isArray(mem.media) ? mem.media.find((m) => m.type === 'image')?.url : undefined;
        const hasBruno = Array.isArray(mem.participants) && mem.participants.includes('Bruno');
        const creatorInitial = mem.createdBy && mem.createdBy[0] ? mem.createdBy[0] : 'A';
        const titleInitial = (mem.title || 'R').slice(0, 1).toUpperCase();

        try {
          const iconHtml = `
            <div class="relative cursor-pointer select-none">
              ${
                isSelected
                  ? '<div class="absolute -inset-2 rounded-full bg-emerald-500/30 pin-pulse-active"></div>'
                  : ''
              }
              <div class="w-11 h-11 rounded-full p-0.5 bg-white border-2 ${
                isSelected ? 'border-emerald-600 ring-2 ring-amber-400' : 'border-slate-300'
              } shadow-lg overflow-hidden transition-transform duration-200 transform ${
                isSelected ? 'scale-115' : 'hover:scale-110'
              }">
                ${
                  firstPhoto
                    ? '<img src="' + firstPhoto + '" alt="" class="w-full h-full object-cover rounded-full" />'
                    : '<div class="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-800 font-bold text-xs">' + titleInitial + '</div>'
                }
              </div>
              <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow ${
                hasBruno
                  ? 'bg-amber-400 text-amber-950 border border-amber-500'
                  : 'bg-emerald-600 text-white border border-emerald-700'
              }">
                ${hasBruno ? 'B' : creatorInitial}
              </div>
            </div>
          `;

          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-leaflet-marker',
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          });

          const marker = L.marker([lat, lng], { icon: customIcon });

          marker.on('click', () => {
            onSelectMemory(mem);
          });

          marker.addTo(markersLayer);
        } catch (err) {
          console.warn('Error al renderizar marcador de recuerdo:', mem, err);
        }
      });
    }, [memories, selectedMemory, mapReady, onSelectMemory]);

    const handleLocate = useCallback(async () => {
      if (isLocating) return;
      setIsLocating(true);
      try {
        const pos = await getAccurateCurrentPosition({ timeoutMs: 6000, maximumAgeMs: 60000 });
        if (mapRef.current) {
          mapRef.current.flyTo([pos[1], pos[0]], 14, { duration: 1 });
          const L = LRef.current || (await import('leaflet')).default;
          const iconHtml = `
            <div class="relative flex items-center justify-center">
              <div class="w-6 h-6 rounded-full bg-sky-500 border-2 border-white shadow-lg animate-pulse"></div>
              <div class="absolute -inset-1 rounded-full bg-sky-400 opacity-30 animate-ping"></div>
            </div>
          `;
          const icon = L.divIcon({
            html: iconHtml,
            className: 'user-loc-pin',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });
          if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker([pos[1], pos[0]], { icon, title: 'Tu ubicación actual' }).addTo(mapRef.current);
          } else {
            userMarkerRef.current.setLatLng([pos[1], pos[0]]);
          }
        }
      } catch {
        showErrorAlert(
          'No se pudo acceder a tu ubicación',
          'Asegurate de tener los permisos de ubicación activados en tu navegador.'
        );
      } finally {
        setIsLocating(false);
      }
    }, [isLocating]);

    const controlBtnClass =
      'w-10 h-10 rounded-xl bg-white/95 hover:bg-white text-slate-700 border border-slate-200 shadow-md flex items-center justify-center backdrop-blur-md transition active:scale-95';

    return (
      <div className={`relative w-full h-full bg-slate-100 overflow-hidden ${className}`}>
        {/* Contenedor canvas de Leaflet con tamaño completo asegurado */}
        <div
          ref={containerRef}
          className="w-full h-full absolute inset-0 z-0"
          style={{ minHeight: '100%', minWidth: '100%' }}
        />

        {/* Controles flotantes del mapa (arriba a la derecha) */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          {/* Selector de capa */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLayerMenuOpen((open) => !open)}
              title="Cambiar capa de mapa"
              className={controlBtnClass}
            >
              <Layers className="w-4 h-4 text-emerald-700" />
            </button>
            {isLayerMenuOpen && (
              <div className="absolute right-0 top-12 flex flex-col gap-1 p-1.5 bg-white border border-slate-200 rounded-xl shadow-xl w-44 z-30">
                {TILE_LAYERS.map((tl, idx) => (
                  <button
                    key={tl.id}
                    type="button"
                    onClick={() => changeTileLayer(idx)}
                    className={`text-left text-xs px-2.5 py-2 rounded-lg transition font-medium ${
                      selectedTileIdx === idx
                        ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tl.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            title="Acercar"
            className={controlBtnClass}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            title="Alejar"
            className={controlBtnClass}
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Centrar en Florianópolis */}
          <button
            type="button"
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1 });
              }
            }}
            title="Centrar en Florianópolis"
            className={`${controlBtnClass} text-emerald-700`}
          >
            <Compass className="w-4 h-4" />
          </button>

          {/* Ver todos los recuerdos */}
          {memories.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const map = mapRef.current;
                const L = LRef.current;
                if (!map || !L) return;
                const validCoords = memories
                  .filter((m) => m?.coordinates && !isNaN(m.coordinates[0]) && !isNaN(m.coordinates[1]))
                  .map((m) => [m.coordinates[1], m.coordinates[0]] as [number, number]);
                if (validCoords.length === 0) return;
                const bounds = L.latLngBounds(validCoords);
                map.fitBounds(bounds, { padding: [56, 56], maxZoom: 14 });
              }}
              title="Ver todos los recuerdos"
              className={controlBtnClass}
            >
              <Maximize className="w-4 h-4" />
            </button>
          )}

          {/* Mi ubicación GPS */}
          <button
            type="button"
            onClick={handleLocate}
            disabled={isLocating}
            title="Mi ubicación actual GPS"
            className={`${controlBtnClass} text-emerald-700 disabled:opacity-60`}
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
        </div>

        {/* Leyenda minimalista (Escritorio) */}
        <div className="absolute bottom-4 left-4 z-10 hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm text-xs text-slate-600">
          <span className="flex items-center gap-1 font-semibold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Floripa
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 font-semibold text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Bruno
          </span>
          <span className="text-slate-300">•</span>
          <span className="font-medium text-slate-700">
            {memories.length} recuerdos en el mapa
          </span>
        </div>
      </div>
    );
  }
);

InteractiveMap.displayName = 'InteractiveMap';
