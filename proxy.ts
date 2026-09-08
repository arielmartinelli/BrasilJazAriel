import { NextResponse, type NextRequest } from 'next/server';

/**
 * Content Security Policy por request.
 *
 * Se genera un nonce nuevo en cada respuesta y se pasa a Next por la cabecera
 * de request: Next lo inyecta automaticamente en sus propios <script>.
 * Con 'strict-dynamic' cualquier script sin nonce queda bloqueado, que es lo
 * que corta un XSS aunque alguien logre inyectar HTML en un titulo o descripcion.
 */
const ALLOWED = {
  // Tiles de mapas, fotos de Cloudinary, previews locales.
  img: [
    'https://res.cloudinary.com',
    'https://images.unsplash.com',
    'https://tile.openstreetmap.org',
    'https://*.tile.openstreetmap.org',
    'https://tile.opentopomap.org',
    'https://*.tile.opentopomap.org',
  ],
  // Supabase (REST + realtime por websocket) y geocoding de OpenStreetMap.
  connect: [
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://nominatim.openstreetmap.org',
    'https://res.cloudinary.com',
    // Subida directa del archivo, sin pasar por Vercel (ver /api/upload/signature).
    'https://api.cloudinary.com',
  ],
  media: ['https://res.cloudinary.com'],

};

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: ${ALLOWED.img.join(' ')};
    media-src 'self' blob: ${ALLOWED.media.join(' ')};
    font-src 'self' data:;
    connect-src 'self' ${ALLOWED.connect.join(' ')};
    worker-src 'self' blob:;
    manifest-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // Se saltea assets estaticos y el optimizador de imagenes: no necesitan CSP
  // y aplicarla ahi solo agrega latencia.
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|webmanifest)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
