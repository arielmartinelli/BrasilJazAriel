'use client';

import type { MediaItem, MediaType } from './types';

/**
 * Subida directa del navegador a Cloudinary.
 *
 * El archivo NO pasa por Vercel. El servidor solo entrega una firma corta
 * (/api/upload/signature) y el binario viaja directo al CDN. Esto es lo que
 * permite subir videos: las Serverless Functions de Vercel rechazan cualquier
 * cuerpo mayor a 4.5 MB, asi que por la ruta anterior ningun video pasaba.
 */

// Techos propios, para no llenar la cuota gratuita sin querer.
export const MAX_BYTES: Record<MediaType, number> = {
  image: 25 * 1024 * 1024,   // 25 MB
  video: 500 * 1024 * 1024,  // 500 MB
  audio: 50 * 1024 * 1024,   // 50 MB
};

export function kindFromFile(file: File): MediaType | null {
  const type = file.type.toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds || !Number.isFinite(seconds)) return '';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

interface SignaturePayload {
  cloudName: string;
  apiKey: string;
  resourceType: 'image' | 'video';
  signature: string;
  timestamp: number;
  folder: string;
  allowed_formats: string;
}

async function getSignature(kind: MediaType): Promise<SignaturePayload> {
  const response = await fetch('/api/upload/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error ?? 'No se pudo autorizar la subida');
  }
  return response.json();
}

export interface UploadResult extends MediaItem {
  bytes: number;
}

/**
 * Sube un archivo y devuelve el MediaItem listo para guardar.
 * `onProgress` recibe 0-100; con archivos grandes es lo unico que evita que
 * parezca colgado.
 */
export async function uploadToCloudinary(
  file: File,
  kind: MediaType,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<UploadResult> {
  const payload = await getSignature(kind);

  return new Promise<UploadResult>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', payload.apiKey);
    form.append('timestamp', String(payload.timestamp));
    form.append('folder', payload.folder);
    form.append('allowed_formats', payload.allowed_formats);
    form.append('signature', payload.signature);

    // XMLHttpRequest y no fetch: es la unica forma de tener progreso de subida.
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${payload.cloudName}/${payload.resourceType}/upload`
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('Respuesta inesperada de Cloudinary'));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const message = (data?.error as { message?: string } | undefined)?.message;
        reject(new Error(message ?? 'Cloudinary rechazó el archivo'));
        return;
      }

      resolve({
        id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url: String(data.secure_url),
        type: kind,
        caption: '',
        durationSeconds: typeof data.duration === 'number' ? data.duration : undefined,
        bytes: typeof data.bytes === 'number' ? data.bytes : file.size,
      });
    };

    xhr.onerror = () => reject(new Error('Se cortó la conexión durante la subida'));
    xhr.onabort = () => reject(new Error('Subida cancelada'));

    signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    xhr.send(form);
  });
}
