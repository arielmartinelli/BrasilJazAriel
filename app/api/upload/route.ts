import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { hasValidSession } from '@/lib/server/session';
import { getClientIp, rateLimit } from '@/lib/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

// Limites: protegen la cuota gratuita de Cloudinary y la memoria del servidor.
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;  // 15 MB
const MAX_VIDEO_BYTES = 120 * 1024 * 1024; // 120 MB

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif',
]);
const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v',
]);

/**
 * Verifica los primeros bytes del archivo.
 * El Content-Type que manda el navegador es solo una sugerencia: se puede
 * falsear. Esto confirma que el binario realmente es lo que dice ser.
 */
function looksLikeRealMedia(buffer: Buffer, isVideo: boolean): boolean {
  if (buffer.length < 12) return false;
  const hex = buffer.subarray(0, 12).toString('hex').toLowerCase();
  const ascii = buffer.subarray(0, 12).toString('latin1');

  if (!isVideo) {
    if (hex.startsWith('ffd8ff')) return true;                       // JPEG
    if (hex.startsWith('89504e47')) return true;                     // PNG
    if (ascii.startsWith('GIF8')) return true;                       // GIF
    if (ascii.startsWith('RIFF') && ascii.includes('WEBP')) return true; // WEBP
    if (ascii.slice(4, 8) === 'ftyp') return true;                   // HEIC / AVIF
    return false;
  }

  if (ascii.slice(4, 8) === 'ftyp') return true;                     // MP4 / MOV / M4V
  if (hex.startsWith('1a45dfa3')) return true;                       // WEBM / MKV
  return false;
}

export async function POST(request: Request) {
  // 1. Solo gente con sesion valida puede subir a nuestra cuenta.
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // 2. Tope de subidas por IP: 40 archivos cada 10 minutos.
  const limit = rateLimit(`upload:${getClientIp(request)}`, 40, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Limite de subidas alcanzado. Intenta en ${Math.ceil(limit.retryAfterSeconds / 60)} min.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  if (!isCloudinaryConfigured) {
    // Antes esto devolvia la foto entera como data URL base64. Eso terminaba
    // guardado en la base y en localStorage, rompiendo la cuota del navegador.
    return NextResponse.json(
      { error: 'El almacenamiento de fotos no esta configurado. Falta CLOUDINARY_API_SECRET.' },
      { status: 503 }
    );
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const entry = formData.get('file');
    file = entry instanceof File ? entry : null;
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'No se envio ningun archivo' }, { status: 400 });
  }

  // 3. Tipo declarado dentro de la lista permitida.
  const declaredType = file.type.toLowerCase();
  const isVideo = ALLOWED_VIDEO_TYPES.has(declaredType);
  const isImage = ALLOWED_IMAGE_TYPES.has(declaredType);
  if (!isVideo && !isImage) {
    return NextResponse.json(
      { error: 'Formato no permitido. Se aceptan JPG, PNG, WEBP, HEIC, GIF, MP4, MOV y WEBM.' },
      { status: 415 }
    );
  }

  // 4. Tamanio antes de cargar nada en memoria.
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `El archivo pesa demasiado. Maximo ${Math.round(maxBytes / 1024 / 1024)} MB.` },
      { status: 413 }
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'El archivo esta vacio' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 5. El contenido real coincide con lo declarado.
  if (!looksLikeRealMedia(buffer, isVideo)) {
    return NextResponse.json(
      { error: 'El archivo no parece una foto o video valido.' },
      { status: 415 }
    );
  }

  try {
    const uploaded = await new Promise<{ secure_url: string; public_id: string; width?: number; height?: number }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'nossa_historia',
            resource_type: isVideo ? 'video' : 'image',
            // Nombre generado por Cloudinary: no filtramos el nombre original,
            // que puede llevar datos personales o rutas del telefono.
            use_filename: false,
            unique_filename: true,
            overwrite: false,
            invalidate: true,
            transformation: isVideo
              ? undefined
              : [{ quality: 'auto:good', fetch_format: 'auto' }],
          },
          (error, result) => {
            if (error || !result) {
              reject(error ?? new Error('Cloudinary no devolvio resultado'));
            } else {
              resolve(result as { secure_url: string; public_id: string });
            }
          }
        );
        stream.end(buffer);
      }
    );

    return NextResponse.json({
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      type: isVideo ? 'video' : 'image',
    });
  } catch (error) {
    // El detalle queda en el log del servidor. Al cliente solo un mensaje util:
    // devolver el objeto de error revelaba configuracion interna.
    console.error('[api/upload] Cloudinary', error);
    return NextResponse.json(
      { error: 'No se pudo subir el archivo. Revisa las credenciales de Cloudinary.' },
      { status: 502 }
    );
  }
}
