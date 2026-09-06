import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nossa História — Ariel, Jazmín & Bruno',
    short_name: 'Nossa História',
    description: 'Diario visual interactivo de nuestra nueva vida en Brasil',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#009C3B',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
