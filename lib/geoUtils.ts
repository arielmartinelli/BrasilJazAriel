/** Respuesta de la API de busqueda de OpenStreetMap (solo lo que usamos). */
interface NominatimPlace {
  display_name: string;
  lat: string;
  lon: string;
}

export function parseGoogleMapsOrCoords(input: string): { coords: [number, number]; name?: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Direct coordinates: "-27.5969, -48.5496" or "-27.5969 -48.5496"
  const directMatch = trimmed.match(/(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
  if (directMatch) {
    const lat = parseFloat(directMatch[1]);
    const lng = parseFloat(directMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { coords: [lng, lat] };
    }
  }

  // 2. Google Maps URL with @lat,lng: https://www.google.com/maps/place/.../@-27.5969,-48.5496,15z
  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    return { coords: [lng, lat] };
  }

  // 3. Google Maps URL with ?q=lat,lng or &q=lat,lng
  const qMatch = trimmed.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    return { coords: [lng, lat] };
  }

  // 4. Google Maps URL with ll=lat,lng
  const llMatch = trimmed.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (llMatch) {
    const lat = parseFloat(llMatch[1]);
    const lng = parseFloat(llMatch[2]);
    return { coords: [lng, lat] };
  }

  return null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'es,pt,en',
        },
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return '';
    const data = await res.json();
    if (!data) return '';

    const addr = data.address || {};
    const primary = addr.beach || addr.tourism || addr.neighbourhood || addr.suburb || addr.amenity || addr.road;
    const city = addr.city || addr.town || addr.municipality || addr.village || addr.county;
    const state = addr.state;

    const parts = [primary, city, state].filter(Boolean);
    if (parts.length > 0) {
      return parts.slice(0, 2).join(', ');
    }

    return data.display_name?.split(',').slice(0, 2).join(',') || '';
  } catch {
    return '';
  }
}

export async function searchPlaces(query: string): Promise<Array<{ name: string; coords: [number, number] }>> {
  if (!query.trim()) return [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'es,pt,en',
        },
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data: NominatimPlace[] = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((item) => item?.display_name && item.lat && item.lon)
      .map((item) => ({
        name: item.display_name.split(',').slice(0, 3).join(','),
        coords: [parseFloat(item.lon), parseFloat(item.lat)] as [number, number],
      }));
  } catch {
    return [];
  }
}

export function getAccurateCurrentPosition(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocalización no soportada en este navegador'));
      return;
    }

    // Try High Accuracy first (GPS on mobile)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve([pos.coords.longitude, pos.coords.latitude]);
      },
      () => {
        // Fallback with low accuracy (WiFi / Cell towers)
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve([pos.coords.longitude, pos.coords.latitude]);
          },
          (err2) => {
            reject(err2);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}
