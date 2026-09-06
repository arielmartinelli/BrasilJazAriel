'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Check, X, Search, Link2, ExternalLink, Loader2 } from 'lucide-react';
import type * as LeafletType from 'leaflet';
import { parseGoogleMapsOrCoords, reverseGeocode, searchPlaces, getAccurateCurrentPosition } from '@/lib/geoUtils';
import { showErrorAlert } from '@/lib/alerts';
import { useModalA11y } from '@/hooks/useModalA11y';

interface LocationPickerMapProps {
  initialCoordinates: [number, number];
  initialLocationName: string;
  onConfirm: (coords: [number, number], locationName: string) => void;
  onCancel: () => void;
}

const QUICK_LOCATIONS = [
  { name: 'Praia do Campeche, Floripa', coords: [-48.4822, -27.6792] as [number, number] },
  { name: 'Lagoa da Conceição', coords: [-48.4688, -27.6045] as [number, number] },
  { name: 'Praia Mole', coords: [-48.4344, -27.6028] as [number, number] },
  { name: 'Barra da Lagoa', coords: [-48.4285, -27.5744] as [number, number] },
  { name: 'Centro, Florianópolis', coords: [-48.5496, -27.5969] as [number, number] },
  { name: 'Paso de los Libres (Frontera)', coords: [-57.0864, -29.7125] as [number, number] },
  { name: 'Córdoba, Salida en auto', coords: [-64.1888, -31.4201] as [number, number] },
];

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  initialCoordinates,
  initialLocationName,
  onConfirm,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletType.Map | null>(null);
  const markerRef = useRef<LeafletType.Marker | null>(null);

  const [coords, setCoords] = useState<[number, number]>(initialCoordinates);
  const [locationName, setLocationName] = useState(initialLocationName);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; coords: [number, number] }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [googleMapsInput, setGoogleMapsInput] = useState('');
  const [activeTab, setActiveTab] = useState<'quick' | 'search' | 'gmaps'>('quick');

  // Escape cierra, el fondo no scrollea y el foco queda dentro del selector.
  const dialogRef = useModalA11y(true, onCancel);

  useEffect(() => {
    let isMounted = true;

    async function initPicker() {
      if (!containerRef.current || mapRef.current) return;

      const L = (await import('leaflet')).default;
      if (!isMounted || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [coords[1], coords[0]],
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const markerHtml = `
        <div class="w-9 h-9 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-sm font-bold animate-bounce">
          📍
        </div>
      `;

      const markerIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-picker-pin',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([coords[1], coords[0]], {
        icon: markerIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', async () => {
        const latlng = marker.getLatLng();
        const newCoords: [number, number] = [latlng.lng, latlng.lat];
        setCoords(newCoords);
        const autoName = await reverseGeocode(latlng.lat, latlng.lng);
        if (autoName) setLocationName(autoName);
      });

      map.on('click', async (e) => {
        marker.setLatLng(e.latlng);
        const newCoords: [number, number] = [e.latlng.lng, e.latlng.lat];
        setCoords(newCoords);
        const autoName = await reverseGeocode(e.latlng.lat, e.latlng.lng);
        if (autoName) setLocationName(autoName);
      });

      mapRef.current = map;
      markerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    initPicker();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // Se inicializa una sola vez con las coordenadas de entrada; después el
    // mapa se mueve con moveToCoords, no re-creándolo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveToCoords = (newCoords: [number, number], name?: string) => {
    setCoords(newCoords);
    if (name) setLocationName(name);
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([newCoords[1], newCoords[0]]);
      mapRef.current.flyTo([newCoords[1], newCoords[0]], 14, { duration: 1 });
    }
  };

  const handleGetCurrentLocation = async () => {
    setIsGeolocating(true);
    try {
      const currentCoords = await getAccurateCurrentPosition();
      moveToCoords(currentCoords);
      const name = await reverseGeocode(currentCoords[1], currentCoords[0]);
      setLocationName(name || 'Mi ubicación actual');
    } catch {
      showErrorAlert(
        'No pudimos acceder a tu GPS',
        'Verificá los permisos de ubicación de este sitio, o buscá el lugar por nombre.'
      );
    } finally {
      setIsGeolocating(false);
    }
  };

  const handleSearchPlaces = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchPlaces(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
    if (results.length > 0) {
      moveToCoords(results[0].coords, results[0].name);
    }
  };

  const handleApplyGoogleMaps = () => {
    if (!googleMapsInput.trim()) return;
    const parsed = parseGoogleMapsOrCoords(googleMapsInput);
    if (parsed) {
      moveToCoords(parsed.coords);
      reverseGeocode(parsed.coords[1], parsed.coords[0]).then((name) => {
        if (name) setLocationName(name);
      });
      setGoogleMapsInput('');
    } else {
      showErrorAlert(
        'No pudimos leer ese enlace',
        'Probá buscar el lugar por nombre, o pegá coordenadas así: -27.5969, -48.5496'
      );
    }
  };

  const googleMapsWebUrl = `https://www.google.com/maps/search/?api=1&query=${coords[1]},${coords[0]}`;

  return (
    <div
      className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Seleccionar ubicación del recuerdo"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85dvh] max-h-[660px] outline-none"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Seleccionar ubicación del recuerdo</span>
            </h3>
            <p className="text-xs text-slate-500">
              Usa GPS, busca por nombre, pega un link de Google Maps o toca el mapa
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition ${
              activeTab === 'quick'
                ? 'border-emerald-600 text-emerald-800 font-bold bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Lugares Rápidos
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'search'
                ? 'border-emerald-600 text-emerald-800 font-bold bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar Lugar</span>
          </button>
          <button
            onClick={() => setActiveTab('gmaps')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'gmaps'
                ? 'border-emerald-600 text-emerald-800 font-bold bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Google Maps</span>
          </button>
        </div>

        {/* Sub-bar for selected tab */}
        <div className="p-2.5 bg-slate-50 border-b border-slate-200">
          {activeTab === 'quick' && (
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
              <button
                onClick={handleGetCurrentLocation}
                disabled={isGeolocating}
                className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shrink-0 flex items-center gap-1.5 shadow-xs active:scale-95"
              >
                <Navigation className={`w-3.5 h-3.5 ${isGeolocating ? 'animate-spin' : ''}`} />
                <span>{isGeolocating ? 'Localizando...' : '📍 Mi GPS actual'}</span>
              </button>

              {QUICK_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => moveToCoords(loc.coords, loc.name)}
                  className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 transition shrink-0 border border-slate-200 font-medium"
                >
                  {loc.name}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'search' && (
            <form onSubmit={handleSearchPlaces} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ej: Praia Mole, Canasvieiras, Florianópolis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition flex items-center gap-1"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
              </button>
            </form>
          )}

          {activeTab === 'gmaps' && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pegar link de Google Maps o coordenadas (-27.59, -48.54)"
                  value={googleMapsInput}
                  onChange={(e) => setGoogleMapsInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <button
                onClick={handleApplyGoogleMaps}
                type="button"
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition"
              >
                Vincular
              </button>
            </div>
          )}

          {/* Search suggestions dropdown list if active */}
          {activeTab === 'search' && searchResults.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 max-h-28 overflow-y-auto bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              {searchResults.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    moveToCoords(r.coords, r.name);
                    setSearchResults([]);
                  }}
                  className="text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 text-xs text-slate-700 truncate transition"
                >
                  📍 {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="relative flex-1 w-full bg-slate-100">
          <div ref={containerRef} className="w-full h-full absolute inset-0" />

          {/* Floating Pin Coordinates & Google Maps Link */}
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
            <a
              href={googleMapsWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-700 border border-slate-200 shadow-sm backdrop-blur-md text-xs font-semibold flex items-center gap-1 transition"
            >
              <span>Ver en Google Maps</span>
              <ExternalLink className="w-3 h-3 text-emerald-700" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:flex-1">
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Nombre de la playa, ciudad o lugar..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(coords, locationName || 'Brasil')}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar lugar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
