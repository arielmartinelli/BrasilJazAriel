import type { NextConfig } from 'next';

/**
 * Cabeceras de seguridad aplicadas a todas las respuestas.
 * La CSP se arma por request en proxy.ts (necesita un nonce nuevo cada vez),
 * asi que aca van solo las cabeceras estaticas.
 */
const securityHeaders = [
  // Evita que el navegador "adivine" el tipo de archivo (ataques de MIME sniffing).
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Nadie puede embeber el sitio en un iframe (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  // No filtrar la URL completa a sitios externos (las URLs llevan ?memory=id).
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Fuerza HTTPS durante 2 anios, incluidos subdominios.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Apaga APIs del navegador que esta app no usa. La geolocalizacion queda
  // habilitada solo para el propio origen porque el GPS del mapa la necesita.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), payment=(), usb=(), interest-cohort=(), geolocation=(self)',
  },
  // Aisla el contexto de navegacion de ventanas abiertas por terceros.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  // No anunciar que el backend es Next.js.
  poweredByHeader: false,
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
    // Tamanios que realmente usa la UI: evita generar variantes de mas.
    deviceSizes: [360, 480, 640, 828, 1080, 1440, 1920],
    imageSizes: [48, 64, 96, 128, 200, 320, 420],
    formats: ['image/avif', 'image/webp'],
    // Cachea 30 dias las imagenes optimizadas.
    minimumCacheTTL: 2592000,
    // Bloquea SVG remoto: puede contener scripts.
    dangerouslyAllowSVG: false,
  },

  experimental: {
    // Solo importa los iconos usados en vez de todo el paquete.
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Las rutas de API nunca deben cachearse en CDN ni navegador.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
          ...securityHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;
