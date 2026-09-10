import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const vercelLat = request.headers.get('x-vercel-ip-latitude');
  const vercelLng = request.headers.get('x-vercel-ip-longitude');
  const city = request.headers.get('x-vercel-ip-city') || '';
  const country = request.headers.get('x-vercel-ip-country') || '';

  if (vercelLat && vercelLng) {
    const lat = parseFloat(vercelLat);
    const lng = parseFloat(vercelLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      return NextResponse.json({
        coords: [lng, lat] as [number, number],
        city: decodeURIComponent(city),
        country,
        source: 'vercel',
      });
    }
  }

  return NextResponse.json({
    coords: [-48.5496, -27.6000] as [number, number],
    city: 'Florianópolis',
    country: 'BR',
    source: 'fallback',
  });
}
