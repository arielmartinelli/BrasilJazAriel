/**
 * Service worker de Nossa História.
 *
 * Escrito a mano en vez de usar un plugin: las necesidades son pocas y bien
 * definidas, y así no dependemos de que una librería siga al día con Next 16
 * y Turbopack.
 *
 * Estrategias, una por tipo de pedido:
 *  - navegación (el HTML): red primero, caché como red de contención. Así
 *    siempre ves la versión nueva si hay señal, y la app abre igual si no.
 *  - estáticos de Next (/_next/static): caché primero. Llevan hash en el
 *    nombre, así que nunca cambian de contenido.
 *  - fotos y tiles del mapa: caché primero con tope, para poder ver los
 *    recuerdos ya vistos y el mapa de la zona sin datos.
 *  - /api: SOLO red. Nunca se cachea: devolver recuerdos viejos como si
 *    fueran actuales sería peor que fallar.
 */

const VERSION = 'v1';
const SHELL_CACHE = `nh-shell-${VERSION}`;
const ASSET_CACHE = `nh-assets-${VERSION}`;
const MEDIA_CACHE = `nh-media-${VERSION}`;

const OFFLINE_URL = '/';
const MEDIA_CACHE_MAX = 250;

const MEDIA_HOSTS = [
  'res.cloudinary.com',
  'tile.openstreetmap.org',
  'server.arcgisonline.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => {})
  );
  // Toma el control sin esperar a que se cierren las pestañas viejas.
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
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  // Se borran las más viejas primero (el orden de keys() es de inserción).
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      // Se guarda la respuesta entera, cabeceras incluidas. Importa porque el
      // HTML lleva un nonce de CSP que debe coincidir con su propia cabecera:
      // guardar ambos juntos los mantiene consistentes.
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? caches.match(OFFLINE_URL);
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  // Las respuestas opacas (sin CORS) se guardan igual: sirven para mostrarlas,
  // aunque no podamos leer su contenido.
  if (response && (response.ok || response.type === 'opaque')) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    if (maxEntries) trimCache(cacheName, maxEntries);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo GET. Un POST no se cachea ni se reintenta desde acá: de eso se
  // encarga la cola en IndexedDB, que sabe reconstruir el recuerdo entero.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Nunca cachear la API.
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return;

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

// La app avisa cuando quiere que se vacíe la caché de fotos.
self.addEventListener('message', (event) => {
  if (event.data === 'clear-media-cache') {
    event.waitUntil(caches.delete(MEDIA_CACHE));
  }
});
