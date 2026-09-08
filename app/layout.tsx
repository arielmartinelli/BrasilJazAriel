import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistrar } from '@/components/ui/ServiceWorkerRegistrar';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  // Evita el salto de layout cuando entra la fuente real.
  adjustFontFallback: true,
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://brasil-jaz-ariel.vercel.app');

const title = 'Nossa História — Ariel, Jazmín & Bruno';
const description =
  'Diario visual interactivo de nuestra vida en Brasil. Fotos, videos, ruta en auto y mapa de recuerdos.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: 'Nossa História',
  authors: [{ name: 'Ariel & Jazmín' }],
  keywords: ['Brasil', 'Nossa História', 'Florianópolis', 'Viaje en auto', 'Recuerdos'],
  manifest: '/manifest.webmanifest',
  // Es un diario privado: que no lo indexe ningún buscador.
  robots: { index: false, follow: false, nocache: true },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Nossa História',
  },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: '/',
    title,
    description,
    siteName: 'Nossa História',
  },
  twitter: { card: 'summary_large_image', title, description },
};

/**
 * Render dinámico obligatorio.
 *
 * proxy.ts genera un nonce nuevo por request y la CSP usa 'strict-dynamic',
 * que hace que el navegador ignore 'self' y solo ejecute los scripts que
 * llevan ese nonce. Si la página se prerenderizara estática, el HTML quedaría
 * congelado en build con un nonce viejo (o sin ninguno) mientras la cabecera
 * cambia en cada request: el navegador bloquearía TODOS los scripts y la app
 * no arrancaría. Verificado sirviendo el build: sin esto, 0 atributos nonce
 * en el HTML.
 */
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  themeColor: '#047857',
  width: 'device-width',
  initialScale: 1,
  // Se quitó maximumScale: 1. Bloquear el zoom incumple WCAG 1.4.4 y deja sin
  // salida a quien necesita agrandar el texto en el teléfono.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${plusJakartaSans.variable} h-full w-full max-w-full overflow-x-hidden antialiased font-sans`}
    >
      <body className="h-full w-full max-w-full flex flex-col antialiased bg-slate-50 text-slate-900 overflow-x-hidden">
        {/* Salto directo al contenido para quien navega con teclado. */}
        <a
          href="#contenido"
          className="sr-only-focusable absolute left-3 top-3 z-[100] rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          Saltar al contenido
        </a>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
