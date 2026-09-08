'use client';

import type { Memory, MediaItem, MediaType } from '../types';
import { idbDelete, idbGetAll, idbPut } from './db';
import { uploadToCloudinary } from '../uploadClient';

/**
 * Cola de recuerdos pendientes de subir.
 *
 * Cuando no hay señal (o falla la subida), el recuerdo entero —incluidos los
 * archivos originales— queda guardado en IndexedDB. Al volver la conexión se
 * procesa solo: primero suben los archivos a Cloudinary, después se guarda el
 * recuerdo, y recién ahí se borra de la cola.
 *
 * El orden importa: si se borrara antes de confirmar, un corte a mitad de
 * camino perdería el recuerdo para siempre.
 */

export interface PendingFile {
  fileId: string;
  file: File;
  kind: MediaType;
}

export interface PendingMemory {
  id: string;
  /** El recuerdo tal como se va a mandar, con urls 'pending:<fileId>'. */
  draft: Omit<Memory, 'id' | 'createdAt'>;
  files: PendingFile[];
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export const PENDING_URL_PREFIX = 'pending:';

export function newLocalId(prefix = 'pend'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueueMemory(
  draft: Omit<Memory, 'id' | 'createdAt'>,
  files: PendingFile[]
): Promise<PendingMemory> {
  const entry: PendingMemory = {
    id: newLocalId(),
    draft,
    files,
    createdAt: Date.now(),
    attempts: 0,
  };
  await idbPut(entry);
  return entry;
}

export function listPending(): Promise<PendingMemory[]> {
  return idbGetAll<PendingMemory>().then((items) =>
    items.sort((a, b) => a.createdAt - b.createdAt)
  );
}

/**
 * Cache de previsualizaciones locales, una por archivo.
 *
 * Vive a nivel de modulo y no en un ref de React a proposito: asi crear la
 * vista previa es idempotente (el mismo archivo devuelve siempre la misma URL)
 * y se puede llamar durante el render sin efectos secundarios ni fugas. Cada
 * URL se libera cuando su recuerdo sale de la cola.
 */
const previewUrls = new Map<string, string>();

function previewUrlFor(fileId: string, file: File): string {
  const existing = previewUrls.get(fileId);
  if (existing) return existing;

  const url = URL.createObjectURL(file);
  previewUrls.set(fileId, url);
  return url;
}

function releasePreviews(entry: PendingMemory): void {
  for (const { fileId } of entry.files) {
    const url = previewUrls.get(fileId);
    if (url) {
      URL.revokeObjectURL(url);
      previewUrls.delete(fileId);
    }
  }
}

export async function removePending(id: string): Promise<void> {
  const entry = (await listPending()).find((item) => item.id === id);
  if (entry) releasePreviews(entry);
  await idbDelete(id);
}

/**
 * Convierte un pendiente en un Memory mostrable mientras espera.
 * Las fotos se leen del archivo guardado en el telefono, asi que el recuerdo
 * aparece completo en el mapa y en el muro aunque no haya señal.
 *
 * Es idempotente: llamarla dos veces devuelve las mismas URLs.
 */
export function pendingToMemory(entry: PendingMemory): Memory {
  const media: MediaItem[] = entry.draft.media.map((item) => {
    if (!item.url.startsWith(PENDING_URL_PREFIX)) return item;

    const fileId = item.url.slice(PENDING_URL_PREFIX.length);
    const pending = entry.files.find((f) => f.fileId === fileId);
    if (!pending) return { ...item, url: '', pending: true };

    return { ...item, url: previewUrlFor(fileId, pending.file), pending: true };
  });

  return {
    ...entry.draft,
    id: entry.id,
    createdAt: new Date(entry.createdAt).toISOString(),
    media,
    pendingSync: true,
  };
}

export interface FlushResult {
  uploaded: number;
  failed: number;
  /** true si hay que pedir el codigo de acceso otra vez. */
  unauthorized: boolean;
}

/**
 * Intenta subir todo lo pendiente. Seguro de llamar varias veces: un candado
 * evita que dos disparos simultaneos (volvio la red + la persona toco el boton)
 * suban el mismo recuerdo dos veces.
 */
let isFlushing = false;

export async function flushQueue(
  saveMemory: (draft: Omit<Memory, 'id' | 'createdAt'>) => Promise<Memory>,
  onProgress?: (status: string) => void
): Promise<FlushResult> {
  const result: FlushResult = { uploaded: 0, failed: 0, unauthorized: false };
  if (isFlushing) return result;

  isFlushing = true;
  try {
    const pending = await listPending();

    for (const entry of pending) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) break;

      try {
        onProgress?.(`Subiendo "${entry.draft.title}"…`);

        // 1. Los archivos primero. Si alguno falla, no se guarda nada:
        //    el recuerdo queda en la cola con todo su contenido intacto.
        const resolved = new Map<string, MediaItem>();
        for (const item of entry.draft.media) {
          if (!item.url.startsWith(PENDING_URL_PREFIX)) continue;

          const fileId = item.url.slice(PENDING_URL_PREFIX.length);
          const pendingFile = entry.files.find((f) => f.fileId === fileId);
          if (!pendingFile) continue;

          const uploaded = await uploadToCloudinary(pendingFile.file, pendingFile.kind);
          resolved.set(item.url, {
            id: item.id,
            url: uploaded.url,
            type: uploaded.type,
            caption: item.caption,
            durationSeconds: uploaded.durationSeconds,
          });
        }

        const draft = {
          ...entry.draft,
          media: entry.draft.media
            .map((item) => resolved.get(item.url) ?? item)
            .filter((item) => !item.url.startsWith(PENDING_URL_PREFIX)),
        };

        // 2. Recien con todo arriba, se guarda el recuerdo.
        await saveMemory(draft);

        // 3. Y recien con el recuerdo confirmado, se saca de la cola.
        await removePending(entry.id);
        result.uploaded += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';

        // Sesion vencida: no tiene sentido seguir intentando ni gastar reintentos.
        if (/no autorizado/i.test(message)) {
          result.unauthorized = true;
          break;
        }

        await idbPut({ ...entry, attempts: entry.attempts + 1, lastError: message });
        result.failed += 1;
      }
    }
  } finally {
    isFlushing = false;
    onProgress?.('');
  }

  return result;
}
