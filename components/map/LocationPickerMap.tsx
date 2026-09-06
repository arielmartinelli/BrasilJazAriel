'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Check, X } from 'lucide-react';
import type * as LeafletType from 'leaflet';

interface LocationPickerMapProps {
  initialCoordinates: [number, number];
  initialLocationName: string;
  onConfirm: (coords: [number, number], locationName: string) => void;
  onCancel: () => void;
}

const QUICK_LOCATIONS = [
  { name: 'Praia do Campeche, Floripa', coords: [-48.4822, -27.6792] as [number, number] },
  { name: 'Lagoa da Conceição', coords: [-48.4688, -27.6045] as [number, number] },
  { name: 'Barra da Lagoa', coords: [-48.4285, -27.5744] as [number, number] },
  { name: 'Centro, Florianópolis', coords: [-48.5496, -27.5969] as [number, number] },
  { name: 'Puente Hercílio Luz, Floripa', coords: [-48.5661, -27.5936] as [number, number] },
  { name: 'Buenos Aires, Salida en auto', coords: [-58.4200, -34.6037] as [number, number] },
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

  useEffect(() => {
    let isMounted = true;

    async function initPicker() {
      if (!containerRef.current || mapRef.current) return;

      const L = (await import('leaflet')).default;
      if (!isMounted || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [coords[1], coords[0]],
        zoom: 12,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const markerHtml = `
        <div class="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold">
          📍
        </div>
      `;

      const markerIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-picker-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([coords[1], coords[0]], {
        icon: markerIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const latlng = marker.getLatLng();
        setCoords([latlng.lng, latlng.lat]);
      });

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setCoords([e.latlng.lng, e.latlng.lat]);
      });

      mapRef.current = map;
      markerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    }

    initPicker();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const handleQuickSelect = (loc: { name: string; coords: [number, number] }) => {
    setCoords(loc.coords);
    setLocationName(loc.name);
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([loc.coords[1], loc.coords[0]]);
      mapRef.current.flyTo([loc.coords[1], loc.coords[0]], 13, { duration: 1 });
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const currentCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setCoords(currentCoords);
        setLocationName('Mi ubicación GPS');
        setIsGeolocating(false);
        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([currentCoords[1], currentCoords[0]]);
          mapRef.current.flyTo([currentCoords[1], currentCoords[0]], 14, { duration: 1 });
        }
      },
      () => {
        setIsGeolocating(false);
        alert('No pudimos acceder a tu GPS. Toca directamente el mapa.');
      }
    );
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh] max-h-[640px]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Seleccionar coordenada
            </h3>
            <p className="text-xs text-slate-500">Toca en el mapa para situar el recuerdo</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Picks */}
        <div className="p-2 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          <button
            onClick={handleGetCurrentLocation}
            disabled={isGeolocating}
            className="px-3 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition shrink-0 flex items-center gap-1.5 font-medium"
          >
            <Navigation className={`w-3.5 h-3.5 ${isGeolocating ? 'animate-spin' : ''}`} />
            <span>GPS actual</span>
          </button>

          {QUICK_LOCATIONS.map((loc) => (
            <button
              key={loc.name}
              onClick={() => handleQuickSelect(loc)}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-200 text-slate-700 transition shrink-0 border border-slate-200 font-medium"
            >
              {loc.name}
            </button>
          ))}
        </div>

        {/* Map */}
        <div className="relative flex-1 w-full bg-slate-100">
          <div ref={containerRef} className="w-full h-full absolute inset-0" />
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:flex-1">
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Nombre del lugar o playa..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
