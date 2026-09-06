import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://brasil-jaz-ariel.vercel.app')
  ),
  title: "Nossa História — Ariel, Jazmín & Bruno 🇧🇷",
  description: "Diario visual interactivo de nuestra vida en Brasil. Fotos, videos, ruta en auto y mapa de recuerdos.",
  applicationName: "Nossa História",
  authors: [{ name: "Ariel & Jazmín" }],
  generator: "Next.js",
  keywords: ["Brasil", "Nossa História", "Ariel", "Jazmin", "Bruno", "Florianopolis", "Viaje en auto", "Recuerdos"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nossa História",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    title: "Nossa História — Ariel, Jazmín & Bruno 🇧🇷",
    description: "Diario visual interactivo de nuestra vida en Brasil. Fotos, videos, ruta en auto y mapa de recuerdos.",
    siteName: "Nossa História",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nossa História — Ariel, Jazmín & Bruno 🇧🇷",
    description: "Diario visual interactivo de nuestra vida en Brasil. Fotos, videos, ruta en auto y mapa de recuerdos.",
  },
};

export const viewport: Viewport = {
  themeColor: "#009c3b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${plusJakartaSans.variable} h-full antialiased font-sans`}
    >
      <body className="h-full flex flex-col antialiased bg-slate-50 text-slate-900 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
