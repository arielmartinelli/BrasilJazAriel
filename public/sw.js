/**
 * Service worker de Nossa História (v2).
 *
 * Estrategias:
 *  - navegación (el HTML): red primero, caché como contingencia.
 *  - estáticos de Next (/_next/static): caché primero.
 *  - fotos de recuerdos (Cloudinary/Unsplash): caché primero con tope de espacio.
 *  - /api y tiles de mapa: NUNCA se interceptan por el SW; el navegador y Leaflet
 *    gestionan la carga de tiles directamente por HTTP nativo e img-src.
 */

const VERSION = 'v2';
const SHELL_CACHE = `nh-shell-${VERSION}`;
const ASSET_CACHE = `nh-assets-${VERSION}`;
const MEDIA_CACHE = `nh-media-${VERSION}`;

const OFFLINE_URL = '/';
const MEDIA_CACHE_MAX = 250;

const MEDIA_HOSTS = [
  'res.cloudinary.com',
  'images.unsplash.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('nh-') && !key.endsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Evita que la caché de fotos crezca sin techo en el teléfono. */
async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
  } catch {
    // Ignorar errores de caché
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? caches.match(OFFLINE_URL);
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      if (maxEntries) trimCache(cacheName, maxEntries);
    }
    return response;
  } catch {
    return fetch(request);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Nunca cachear la API
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

  // NUNCA interceptar tiles de mapa (OSM, Esri, CartoDB): dejar que Leaflet y el navegador los pidan nativamente
  if (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('arcgisonline.com') ||
    url.hostname.includes('cartocdn.com')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (MEDIA_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE, MEDIA_CACHE_MAX));
    return;
  }

  if (url.origin === self.location.origin && /\.(svg|png|jpg|jpeg|webp|avif|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'clear-media-cache') {
    event.waitUntil(caches.delete(MEDIA_CACHE));
  }
});
