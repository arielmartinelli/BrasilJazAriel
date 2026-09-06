import type { Memory } from './types';
import { daysBetween, parseMemoryDate } from './dates';

export interface TripStats {
  totalMemories: number;
  photos: number;
  videos: number;
  places: number;
  withBruno: number;
  kilometers: number;
  daysSinceStart: number;
  firstDate: string | null;
  lastDate: string | null;
  byStage: Record<string, number>;
}

const EARTH_RADIUS_KM = 6371;

/** Distancia en km entre dos puntos [lng, lat] sobre la superficie terrestre. */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function sortChronologically(memories: Memory[]): Memory[] {
  return [...memories].sort(
    (a, b) => parseMemoryDate(a.date).getTime() - parseMemoryDate(b.date).getTime()
  );
}

export function computeStats(memories: Memory[]): TripStats {
  const chronological = sortChronologically(memories);

  let photos = 0;
  let videos = 0;
  let withBruno = 0;
  const places = new Set<string>();
  const byStage: Record<string, number> = {};

  for (const memory of chronological) {
    for (const item of memory.media) {
      if (item.type === 'video') videos += 1;
      else photos += 1;
    }
    if (memory.participants.includes('Bruno')) withBruno += 1;
    if (memory.locationName) places.add(memory.locationName.trim().toLowerCase());
    byStage[memory.stageId] = (byStage[memory.stageId] ?? 0) + 1;
  }

  // Distancia acumulada siguiendo el orden cronologico de los recuerdos.
  // Es una aproximacion en linea recta entre paradas, no el recorrido por ruta.
  let kilometers = 0;
  for (let i = 1; i < chronological.length; i += 1) {
    kilometers += haversineKm(
      chronological[i - 1].coordinates,
      chronological[i].coordinates
    );
  }

  const firstDate = chronological[0]?.date ?? null;
  const lastDate = chronological[chronological.length - 1]?.date ?? null;

  return {
    totalMemories: chronological.length,
    photos,
    videos,
    places: places.size,
    withBruno,
    kilometers: Math.round(kilometers),
    daysSinceStart: firstDate ? daysBetween(firstDate) : 0,
    firstDate,
    lastDate,
    byStage,
  };
}

/**
 * Puntos de la ruta del viaje en auto para dibujar en el mapa.
 * Usa solo la etapa "01-viaje" si tiene al menos dos paradas; si no,
 * traza el recorrido general de todos los recuerdos.
 */
export function routePoints(memories: Memory[]): Array<[number, number]> {
  const travel = sortChronologically(memories.filter((m) => m.stageId === '01-viaje'));
  const source = travel.length >= 2 ? travel : sortChronologically(memories);
  return source.map((m) => [m.coordinates[1], m.coordinates[0]]); // [lat, lng] para Leaflet
}
