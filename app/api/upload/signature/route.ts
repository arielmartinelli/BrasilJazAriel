import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { hasValidSession } from '@/lib/server/session';
import { getClientIp, rateLimit } from '@/lib/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const isConfigured = Boolean(cloudName && apiKey && apiSecret);

/**
 * Firma para subir directo del navegador a Cloudinary.
 *
 * POR QUE ESTA RUTA EXISTE
 * Antes el archivo viajaba navegador -> /api/upload -> Cloudinary. Ese salto
 * del medio corre como Serverless Function en Vercel, que rechaza cualquier
 * cuerpo de request mayor a 4.5 MB. Los videos (y las fotos grandes del
 * celular) nunca llegaban al codigo: los cortaba la plataforma antes.
 *
 * Ahora el servidor solo firma un permiso chico y el archivo va directo a
 * Cloudinary, sin pasar por Vercel. Sin techo de 4.5 MB.
 *
 * SIGUE SIENDO SEGURO
 * El api_secret nunca sale del servidor. La firma solo se entrega a quien ya
 * tiene sesion valida, vence en una hora, y Cloudinary rechaza cualquier
 * subida cuyos parametros no coincidan exactamente con los firmados: no se
 * puede cambiar la carpeta de destino ni los formatos permitidos.
 */

// Formatos aceptados por tipo. Van firmados, asi que Cloudinary los impone.
const ALLOWED_FORMATS = {
  image: 'jpg,jpeg,png,webp,gif,heic,heif,avif',
  video: 'mp4,mov,m4v,webm,avi,3gp',
  audio: 'mp3,m4a,aac,wav,ogg,webm,opus,mp4',
} as const;

type Kind = keyof typeof ALLOWED_FORMATS;

export async function POST(request: Request) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!isConfigured) {
    return NextResponse.json(
      { error: 'El almacenamiento de archivos no esta configurado.' },
      { status: 503 }
    );
  }

  // Una firma habilita una subida. 60 por cada 10 minutos por IP.
  const limit = rateLimit(`sign:${getClientIp(request)}`, 60, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Demasiadas subidas seguidas. Esperá unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  let kind: Kind = 'image';
  try {
    const body = await request.json();
    if (body?.kind === 'video' || body?.kind === 'audio' || body?.kind === 'image') {
      kind = body.kind;
    }
  } catch {
    return NextResponse.json({ error: 'Solicitud invalida' }, { status: 400 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  // Cloudinary guarda el audio bajo resource_type 'video'; no tiene uno propio.
  const resourceType = kind === 'image' ? 'image' : 'video';
  const folder = `nossa_historia/${kind}`;

  // Todo parametro incluido aca queda blindado por la firma.
  const paramsToSign = {
    folder,
    allowed_formats: ALLOWED_FORMATS[kind],
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret!);

  return NextResponse.json({
    cloudName,
    apiKey,
    resourceType,
    signature,
    ...paramsToSign,
  });
}
