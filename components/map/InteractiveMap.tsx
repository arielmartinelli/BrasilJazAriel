'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { Memory } from '@/lib/types';
import { Compass, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import type * as LeafletType from 'leaflet';

export interface InteractiveMapRef {
  flyToMemory: (memory: Memory, customZoom?: number) => void;
  resetView: () => void;
  resize: () => void;
}

interface InteractiveMapProps {
  memories: Memory[];
  selectedMemory: Memory | null;
  onSelectMemory: (memory: Memory) => void;
  className?: string;
}

// 100% Free, reliable tile providers WITHOUT any API key or watermarks
const TILE_LAYERS = [
  {
    id: 'osm',
    name: 'Calles & Playas',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  },
  {
    id: 'esri',
    name: 'Topografía & Relieve',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri',
  },
];

export const InteractiveMap = forwardRef<InteractiveMapRef, InteractiveMapProps>(
  ({ memories, selectedMemory, onSelectMemory, className = '' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletType.Map | null>(null);
    const currentTileLayerRef = useRef<LeafletType.TileLayer | null>(null);
    const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);
    const LRef = useRef<typeof LeafletType | null>(null);
    const [selectedTileIdx, setSelectedTileIdx] = useState(0);

    // Florianópolis coordinates: [lat, lng]
    const DEFAULT_CENTER: [number, number] = [-27.6000, -48.5496];
    const DEFAULT_ZOOM = 10;

    useImperativeHandle(ref, () => ({
      flyToMemory: (memory: Memory, customZoom = 13.5) => {
        if (!mapRef.current) return;
        mapRef.current.flyTo([memory.coordinates[1], memory.coordinates[0]], customZoom, {
          duration: 1.2,
          easeLinearity: 0.2,
        });
      },
      resetView: () => {
        if (!mapRef.current) return;
        mapRef.current.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1 });
      },
      resize: () => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      },
    }));

    // Initialize Leaflet Map
    useEffect(() => {
      let isMounted = true;

      async function initLeaflet() {
        if (!containerRef.current || mapRef.current) return;

        const L = (await import('leaflet')).default;
        LRef.current = L;

        if (!isMounted || !containerRef.current) return;

        const map = L.map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          zoomControl: false,
          attributionControl: false,
        });

        // Add initial clean tile layer
        const tileConfig = TILE_LAYERS[0];
        const tileLayer = L.tileLayer(tileConfig.url, {
          maxZoom: tileConfig.maxZoom,
          attribution: tileConfig.attribution,
        }).addTo(map);

        currentTileLayerRef.current = tileLayer;

        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapRef.current = map;

        // Invalidate size on multiple intervals to guarantee full-height coverage
        map.invalidateSize();
        setTimeout(() => map.invalidateSize(), 150);
        setTimeout(() => map.invalidateSize(), 400);
      }

      initLeaflet();

      // Window resize listener
      const handleResize = () => {
        if (mapRef.current) mapRef.current.invalidateSize();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        isMounted = false;
        window.removeEventListener('resize', handleResize);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }, []);

    // Change tile provider
    const changeTileLayer = (idx: number) => {
      if (!mapRef.current || !LRef.current) return;
      const L = LRef.current;
      if (currentTileLayerRef.current) {
        mapRef.current.removeLayer(currentTileLayerRef.current);
      }
      const newConfig = TILE_LAYERS[idx];
      const newLayer = L.tileLayer(newConfig.url, {
        maxZoom: newConfig.maxZoom,
        attribution: newConfig.attribution,
      }).addTo(mapRef.current);
      currentTileLayerRef.current = newLayer;
      setSelectedTileIdx(idx);
    };

    // Update pins
    useEffect(() => {
      if (!mapRef.current || !markersLayerRef.current || !LRef.current) return;

      const L = LRef.current;
      const markersLayer = markersLayerRef.current;
      markersLayer.clearLayers();

      memories.forEach((mem) => {
        const isSelected = selectedMemory?.id === mem.id;
        const firstPhoto = mem.media.find((m) => m.type === 'image')?.url;
        const hasBruno = mem.participants.includes('Bruno');

        const iconHtml = `
          <div class="relative cursor-pointer select-none">
            ${
              isSelected
                ? `<div class="absolute -inset-2 rounded-full bg-emerald-500/30 pin-pulse-active"></div>`
                : ''
            }
            <div class="w-11 h-11 rounded-full p-0.5 bg-white border-2 ${
              isSelected ? 'border-emerald-600 ring-2 ring-amber-400' : 'border-slate-300'
            } shadow-lg overflow-hidden transition-transform duration-200 transform ${
              isSelected ? 'scale-115' : 'hover:scale-110'
            }">
              ${
                firstPhoto
                  ? `<img src="${firstPhoto}" class="w-full h-full object-cover rounded-full" />`
                  : `<div class="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-800 font-bold text-xs">${mem.title.slice(0, 1)}</div>`
              }
            </div>
            <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow ${
              hasBruno
                ? 'bg-amber-400 text-amber-950 border border-amber-500'
                : 'bg-emerald-600 text-white border border-emerald-700'
            }">
              ${hasBruno ? 'B' : mem.createdBy[0]}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-leaflet-marker',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

        const marker = L.marker([mem.coordinates[1], mem.coordinates[0]], { icon: customIcon });

        marker.on('click', () => {
          onSelectMemory(mem);
        });

        marker.addTo(markersLayer);
      });
    }, [memories, selectedMemory]);

    return (
      <div className={`relative w-full h-full bg-slate-100 overflow-hidden ${className}`}>
        {/* Leaflet canvas container taking full height and width */}
        <div ref={containerRef} className="w-full h-full absolute inset-0 z-0" />

        {/* Floating Map Controls (Top Right) */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          {/* Tile Layer Selector */}
          <div className="relative group">
            <button
              title="Cambiar capa de mapa"
              className="w-10 h-10 rounded-xl bg-white/95 hover:bg-white text-slate-700 border border-slate-200 shadow-md flex items-center justify-center backdrop-blur-md transition"
            >
              <Layers className="w-4 h-4 text-emerald-700" />
            </button>
            <div className="absolute right-0 top-12 hidden group-hover:flex flex-col gap-1 p-1.5 bg-white border border-slate-200 rounded-xl shadow-xl w-38 z-30">
              {TILE_LAYERS.map((tl, idx) => (
                <button
                  key={tl.id}
                  onClick={() => changeTileLayer(idx)}
                  className={`text-left text-xs px-2.5 py-1.5 rounded-lg transition font-medium ${
                    selectedTileIdx === idx
                      ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom In */}
          <button
            onClick={() => mapRef.current?.zoomIn()}
            title="Acercar"
            className="w-10 h-10 rounded-xl bg-white/95 hover:bg-white text-slate-700 border border-slate-200 shadow-md flex items-center justify-center backdrop-blur-md transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => mapRef.current?.zoomOut()}
            title="Alejar"
            className="w-10 h-10 rounded-xl bg-white/95 hover:bg-white text-slate-700 border border-slate-200 shadow-md flex items-center justify-center backdrop-blur-md transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Recenter on Florianópolis */}
          <button
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1 });
              }
            }}
            title="Centrar en Florianópolis"
            className="w-10 h-10 rounded-xl bg-white/95 hover:bg-white text-emerald-700 border border-slate-200 shadow-md flex items-center justify-center backdrop-blur-md transition"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>

        {/* Minimalist Legend (Desktop) */}
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
