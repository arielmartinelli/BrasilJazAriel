'use client';

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from 'react';
import type * as LeafletType from 'leaflet';
import { Compass, Layers, ZoomIn, ZoomOut, Navigation, Maximize, Route } from 'lucide-react';
import { Memory } from '@/lib/types';
import { getAccurateCurrentPosition } from '@/lib/geoUtils';
import { escapeHtml, safeImageSrc, thumbUrl } from '@/lib/media';
import { routePoints } from '@/lib/stats';
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
  /** El tour de la historia no necesita agrupar pines ni ver la ruta. */
  enableClustering?: boolean;
  showRouteByDefault?: boolean;
  /** Al abrir, centrar el mapa en donde esta la persona. */
  centerOnUserOnLoad?: boolean;
}

/**
 * Capas del mapa. Todas gratuitas, sin API key y sin marca de agua.
 *
 * `dark: true` no aplica ningun filtro CSS: son mapas disenados oscuros de
 * origen. La version anterior invertia los colores del OSM claro por CSS, que
 * dejaba el agua gris y los textos con halos raros.
 *
 * `subdomains` reparte los pedidos entre varios servidores de CARTO, que es
 * como ellos piden que se los consuma. `{r}` pide la version @2x en pantallas
 * de alta densidad: los carteles se leen mucho mejor en el telefono.
 */
const TILE_LAYERS = [
  {
    id: 'satellite',
    name: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics',
    subdomains: undefined,
    retina: false,
    dark: true, // las fotos aereas son oscuras: la ruta va en verde claro
  },
  {
    id: 'voyager',
    name: 'Calles y playas',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    retina: true,
    dark: false,
  },
  {
    id: 'light',
    name: 'Claro minimalista',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    retina: true,
    dark: false,
  },
  {
    id: 'terrain',
    name: 'Relieve y trilhas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri',
    subdomains: undefined,
    retina: false,
    dark: false,
  },
  {
    id: 'dark',
    name: 'Modo noche',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    retina: true,
    dark: true,
  },
] as const;

/** Opciones de Leaflet para una capa, sin repetir la logica en dos lugares. */
function tileOptions(config: (typeof TILE_LAYERS)[number]) {
  return {
    maxZoom: config.maxZoom,
    attribution: config.attribution,
    keepBuffer: 2,
    ...(config.subdomains ? { subdomains: config.subdomains } : {}),
    ...(config.retina ? { detectRetina: true } : {}),
  };
}

const DEFAULT_CENTER: [number, number] = [-27.6, -48.5496];
const DEFAULT_ZOOM = 10;
const USER_ZOOM = 13;

/**
 * Una sola vez por carga de pagina. El mapa se desmonta y se vuelve a montar
 * al cambiar entre Mapa, Historia y Muro; sin esta bandera volveria a pedir el
 * GPS y a mover la vista cada vez que la persona vuelve al mapa.
 */
let alreadyCenteredOnUser = false;

export const InteractiveMap = forwardRef<InteractiveMapRef, InteractiveMapProps>(
  (
    {
      memories,
      selectedMemory,
      onSelectMemory,
      className = '',
      enableClustering = true,
      showRouteByDefault = false,
      centerOnUserOnLoad = false,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletType.Map | null>(null);
    const tileLayerRef = useRef<LeafletType.TileLayer | null>(null);
    const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);
    const routeLayerRef = useRef<LeafletType.Polyline | null>(null);
    const userMarkerRef = useRef<LeafletType.Marker | null>(null);
    const LRef = useRef<typeof LeafletType | null>(null);
    // Se guarda en un ref para que el efecto de pines no dependa del callback
    // y no vuelva a dibujar todo cuando el padre re-renderiza.
    const onSelectRef = useRef(onSelectMemory);
    onSelectRef.current = onSelectMemory;

    const [isReady, setIsReady] = useState(false);
    const [tileIndex, setTileIndex] = useState(0);
    const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [showRoute, setShowRoute] = useState(showRouteByDefault);

    const isDarkBasemap = TILE_LAYERS[tileIndex].dark;

    useImperativeHandle(ref, () => ({
      flyToMemory: (memory, customZoom = 13.5) => {
        mapRef.current?.flyTo([memory.coordinates[1], memory.coordinates[0]], customZoom, {
          duration: 1.2,
          easeLinearity: 0.2,
        });
      },
      resetView: () => {
        mapRef.current?.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1 });
      },
      fitAll: () => {
        const map = mapRef.current;
        const L = LRef.current;
        if (!map || !L || memories.length === 0) return;
        const bounds = L.latLngBounds(
          memories.map((m) => [m.coordinates[1], m.coordinates[0]] as [number, number])
        );
        map.fitBounds(bounds, { padding: [56, 56], maxZoom: 14 });
      },
      resize: () => mapRef.current?.invalidateSize(),
    }));

    // ------------------------------------------------------------ init mapa
    useEffect(() => {
      let cancelled = false;
      let observer: ResizeObserver | null = null;

      async function init() {
        if (!containerRef.current || mapRef.current) return;

        const L = (await import('leaflet')).default;
        if (enableClustering) await import('leaflet.markercluster');
        if (cancelled || !containerRef.current) return;

        LRef.current = L;

        const map = L.map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          zoomControl: false,
          attributionControl: true,
          // Rueda del mouse sin Ctrl hacía zoom accidental al scrollear la
          // página en desktop; ahora el gesto es explícito.
          scrollWheelZoom: true,
          preferCanvas: true,
        });

        map.attributionControl.setPrefix('');

        const config = TILE_LAYERS[0];
        tileLayerRef.current = L.tileLayer(config.url, tileOptions(config)).addTo(map);

        markersLayerRef.current = enableClustering
          ? (L as unknown as {
              markerClusterGroup: (options: Record<string, unknown>) => LeafletType.LayerGroup;
            }).markerClusterGroup({
              maxClusterRadius: 48,
              showCoverageOnHover: false,
              spiderfyOnMaxZoom: true,
              disableClusteringAtZoom: 15,
              iconCreateFunction: (cluster: { getChildCount: () => number }) => {
                const count = cluster.getChildCount();
                const size = count > 20 ? 52 : count > 8 ? 46 : 40;
                return L.divIcon({
                  html: `<div class="memory-cluster ${count > 20 ? 'memory-cluster-lg' : ''}" style="width:${size}px;height:${size}px">${count}</div>`,
                  className: 'memory-cluster-wrapper',
                  iconSize: [size, size],
                });
              },
            })
          : L.layerGroup();

        markersLayerRef.current.addTo(map);
        mapRef.current = map;

        // El mapa vive dentro de paneles que cambian de tamaño (expandir mapa,
        // abrir la lista). Un ResizeObserver es más fiable que los setTimeout
        // encadenados que había antes.
        observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(containerRef.current);

        map.invalidateSize();
        setIsReady(true);

        void centerOnUser(map, L);
      }

      /**
       * Abre el mapa donde esta la persona.
       *
       * Se saltea en tres casos, para no pelearse con lo que ya esta pasando:
       *  - si se entro por un enlace /?memory=id (ese recuerdo manda)
       *  - si ya se centro una vez en esta carga de pagina
       *  - si la persona movio el mapa mientras el GPS respondia
       * Si el permiso esta denegado no se muestra ningun error: simplemente
       * se queda en Florianopolis, que es el centro por defecto.
       */
      async function centerOnUser(map: LeafletType.Map, L: typeof LeafletType) {
        if (!centerOnUserOnLoad || alreadyCenteredOnUser) return;
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('memory')) {
          return;
        }

        alreadyCenteredOnUser = true;

        let personMovedMap = false;
        const markMoved = () => { personMovedMap = true; };
        map.on('dragstart', markMoved);
        map.on('zoomstart', markMoved);

        try {
          const [lng, lat] = await getAccurateCurrentPosition();
          if (cancelled || personMovedMap || !mapRef.current) return;

          map.setView([lat, lng], USER_ZOOM, { animate: true });

          userMarkerRef.current = L.marker([lat, lng], {
            icon: L.divIcon({
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="w-6 h-6 rounded-full bg-sky-500 border-2 border-white shadow-lg"></div>
                  <div class="absolute -inset-1 rounded-full bg-sky-400 opacity-30 animate-ping"></div>
                </div>`,
              className: 'user-loc-pin',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            }),
            title: 'Estas aca',
          }).addTo(map);
        } catch {
          /* permiso denegado, sin senial o navegador sin GPS: se queda en Floripa */
        } finally {
          map.off('dragstart', markMoved);
          map.off('zoomstart', markMoved);
        }
      }

      init();

      const handleWindowResize = () => mapRef.current?.invalidateSize();
      window.addEventListener('resize', handleWindowResize);

      return () => {
        cancelled = true;
        window.removeEventListener('resize', handleWindowResize);
        observer?.disconnect();
        mapRef.current?.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        routeLayerRef.current = null;
        userMarkerRef.current = null;
      };
    }, [enableClustering, centerOnUserOnLoad]);

    // ------------------------------------------------------------- pines
    useEffect(() => {
      const map = mapRef.current;
      const L = LRef.current;
      const layer = markersLayerRef.current;
      if (!isReady || !map || !L || !layer) return;

      layer.clearLayers();

      memories.forEach((memory) => {
        const isSelected = selectedMemory?.id === memory.id;
        const hasBruno = memory.participants.includes('Bruno');
        const photo = memory.media.find((m) => m.type === 'image')?.url;

        // El pin sólo necesita 44px: se pide al CDN una miniatura de 96px
        // (2x para pantallas retina) en vez de la foto original de varios MB.
        const thumb = safeImageSrc(thumbUrl(photo, { width: 96, height: 96 }));
        // Todo texto que entra en HTML crudo va escapado. Sin esto, un título
        // con <img onerror=...> ejecutaba código al dibujar el mapa.
        const initial = escapeHtml(memory.title.slice(0, 1).toUpperCase() || '?');
        const badge = escapeHtml(hasBruno ? 'B' : memory.createdBy.slice(0, 1));

        const iconHtml = `
          <div class="relative cursor-pointer select-none">
            ${isSelected ? '<div class="absolute -inset-2 rounded-full bg-emerald-500/30 pin-pulse-active"></div>' : ''}
            <div class="w-11 h-11 rounded-full p-0.5 bg-white border-2 ${
              isSelected ? 'border-emerald-600 ring-2 ring-amber-400' : 'border-slate-300'
            } shadow-lg overflow-hidden transition-transform duration-200 ${
              isSelected ? 'scale-110' : 'hover:scale-110'
            }">
              ${
                thumb
                  ? `<img src="${escapeHtml(thumb)}" alt="" loading="lazy" decoding="async" class="w-full h-full object-cover rounded-full" />`
                  : `<div class="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-800 font-bold text-sm rounded-full">${initial}</div>`
              }
            </div>
            <div class="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold shadow ${
              hasBruno
                ? 'bg-amber-400 text-amber-950 border border-amber-500'
                : 'bg-emerald-600 text-white border border-emerald-700'
            }">${badge}</div>
          </div>
        `;

        const marker = L.marker([memory.coordinates[1], memory.coordinates[0]], {
          icon: L.divIcon({
            html: iconHtml,
            className: 'custom-leaflet-marker',
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          }),
          // Lector de pantalla y navegación por teclado.
          keyboard: true,
          title: memory.title,
          alt: `Recuerdo: ${memory.title}`,
        });

        marker.on('click', () => onSelectRef.current(memory));
        marker.on('keypress', (event: LeafletType.LeafletKeyboardEvent) => {
          if (event.originalEvent.key === 'Enter') onSelectRef.current(memory);
        });

        marker.addTo(layer);
      });
    }, [memories, selectedMemory, isReady]);

    // ---------------------------------------------------- ruta del viaje
    useEffect(() => {
      const map = mapRef.current;
      const L = LRef.current;
      if (!isReady || !map || !L) return;

      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
        routeLayerRef.current = null;
      }
      if (!showRoute) return;

      const points = routePoints(memories);
      if (points.length < 2) return;

      routeLayerRef.current = L.polyline(points, {
        color: isDarkBasemap ? '#5eead4' : '#047857',
        weight: 3.5,
        opacity: 0.85,
        dashArray: '10 8',
        className: 'trip-route-line',
        lineJoin: 'round',
      }).addTo(map);
    }, [memories, showRoute, isDarkBasemap, isReady]);

    // ------------------------------------------------------------- capas
    const changeTileLayer = useCallback((index: number) => {
      const map = mapRef.current;
      const L = LRef.current;
      if (!map || !L) return;

      tileLayerRef.current?.remove();
      const config = TILE_LAYERS[index];
      tileLayerRef.current = L.tileLayer(config.url, tileOptions(config)).addTo(map);

      setTileIndex(index);
      setIsLayerMenuOpen(false);
    }, []);

    const handleLocate = useCallback(async () => {
      if (isLocating) return;
      setIsLocating(true);
      try {
        const [lng, lat] = await getAccurateCurrentPosition();
        const map = mapRef.current;
        const L = LRef.current;
        if (!map || !L) return;

        map.flyTo([lat, lng], 14, { duration: 1 });

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lng]);
        } else {
          userMarkerRef.current = L.marker([lat, lng], {
            icon: L.divIcon({
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="w-6 h-6 rounded-full bg-sky-500 border-2 border-white shadow-lg"></div>
                  <div class="absolute -inset-1 rounded-full bg-sky-400 opacity-30 animate-ping"></div>
                </div>`,
              className: 'user-loc-pin',
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            }),
            title: 'Tu ubicación',
          }).addTo(map);
        }
      } catch {
        // Antes usaba alert() nativo mientras el resto de la app usa SweetAlert.
        showErrorAlert(
          'No pudimos acceder a tu ubicación',
          'Revisá que los permisos de ubicación estén habilitados para este sitio.'
        );
      } finally {
        setIsLocating(false);
      }
    }, [isLocating]);

    const controlClass =
      'w-10 h-10 rounded-xl bg-white/95 hover:bg-white text-slate-700 border border-slate-200 shadow-md flex items-center justify-center backdrop-blur-md transition active:scale-95';

    return (
      <div
        className={`relative h-full w-full overflow-hidden ${isDarkBasemap ? 'map-dark' : 'bg-slate-100'} ${className}`}
      >
        <div
          ref={containerRef}
          className="absolute inset-0 z-0 h-full w-full"
          role="application"
          aria-label={`Mapa con ${memories.length} recuerdos`}
        />

        {/* Controles flotantes */}
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLayerMenuOpen((open) => !open)}
              aria-expanded={isLayerMenuOpen}
              aria-haspopup="menu"
              title="Cambiar capa del mapa"
              className={controlClass}
            >
              <Layers className="h-4 w-4 text-emerald-700" />
              <span className="sr-only">Cambiar capa del mapa</span>
            </button>

            {/* Antes este menú se abría con :hover, así que en el celular era
                imposible de usar. Ahora se abre con click y cierra con Escape. */}
            {isLayerMenuOpen && (
              <div
                role="menu"
                onKeyDown={(event) => event.key === 'Escape' && setIsLayerMenuOpen(false)}
                className="absolute right-0 top-12 z-30 flex w-48 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
              >
                {TILE_LAYERS.map((layer, index) => (
                  <button
                    key={layer.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={tileIndex === index}
                    onClick={() => changeTileLayer(index)}
                    className={`rounded-lg px-2.5 py-2 text-left text-sm font-medium transition ${
                      tileIndex === index
                        ? 'border border-emerald-200 bg-emerald-50 font-semibold text-emerald-800'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {layer.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={() => mapRef.current?.zoomIn()} title="Acercar" className={controlClass}>
            <ZoomIn className="h-4 w-4" />
            <span className="sr-only">Acercar</span>
          </button>

          <button type="button" onClick={() => mapRef.current?.zoomOut()} title="Alejar" className={controlClass}>
            <ZoomOut className="h-4 w-4" />
            <span className="sr-only">Alejar</span>
          </button>

          <button
            type="button"
            onClick={() => mapRef.current?.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1 })}
            title="Centrar en Florianópolis"
            className={`${controlClass} text-emerald-700`}
          >
            <Compass className="h-4 w-4" />
            <span className="sr-only">Centrar en Florianópolis</span>
          </button>

          {memories.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const map = mapRef.current;
                const L = LRef.current;
                if (!map || !L) return;
                map.fitBounds(
                  L.latLngBounds(
                    memories.map((m) => [m.coordinates[1], m.coordinates[0]] as [number, number])
                  ),
                  { padding: [56, 56], maxZoom: 14 }
                );
              }}
              title="Ver todos los recuerdos"
              className={controlClass}
            >
              <Maximize className="h-4 w-4" />
              <span className="sr-only">Ver todos los recuerdos</span>
            </button>
          )}

          {memories.length > 1 && (
            <button
              type="button"
              onClick={() => setShowRoute((value) => !value)}
              aria-pressed={showRoute}
              title={showRoute ? 'Ocultar la ruta del viaje' : 'Mostrar la ruta del viaje'}
              className={`${controlClass} ${showRoute ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''}`}
            >
              <Route className="h-4 w-4" />
              <span className="sr-only">Ruta del viaje</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLocate}
            disabled={isLocating}
            title="Mi ubicación actual"
            className={`${controlClass} text-emerald-700 disabled:opacity-60`}
          >
            <Navigation className={`h-4 w-4 ${isLocating ? 'animate-spin text-emerald-500' : ''}`} />
            <span className="sr-only">Mi ubicación actual</span>
          </button>
        </div>

        {/* Leyenda */}
        <div className="absolute bottom-4 left-4 z-10 hidden items-center gap-2.5 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 text-xs text-slate-600 shadow-sm backdrop-blur-md md:flex">
          <span className="flex items-center gap-1 font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Floripa
          </span>
          <span className="text-slate-300" aria-hidden>•</span>
          <span className="flex items-center gap-1 font-semibold text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden /> Bruno
          </span>
          <span className="text-slate-300" aria-hidden>•</span>
          <span className="font-medium text-slate-700">
            {memories.length} {memories.length === 1 ? 'recuerdo' : 'recuerdos'}
          </span>
        </div>
      </div>
    );
  }
);

InteractiveMap.displayName = 'InteractiveMap';
