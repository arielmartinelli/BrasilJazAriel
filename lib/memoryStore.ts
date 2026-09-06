'use client';

import type { Memory } from './types';

/**
 * Acceso a los recuerdos desde el navegador.
 *
 * Antes este archivo hablaba directo con Supabase usando la anon key, que
 * viaja dentro del bundle publico. Ahora todo pasa por /api/memories, que
 * corre en el servidor, valida la sesion y usa la service role key privada.
 * localStorage queda como cache offline y como modo local sin base de datos.
 */

const LOCAL_STORAGE_KEY = 'nossa_historia_memories_prod_v1';
const ACTIVE_USER_KEY = 'nossa_historia_active_user';

export type Source = 'supabase' | 'local';

export interface LoadResult {
  memories: Memory[];
  source: Source;
  /** true cuando el servidor pidio codigo de acceso. */
  unauthorized: boolean;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// ------------------------------------------------------------- almacen local
export function getStoredMemories(): Memory[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as Memory[]) : [];
  } catch (error) {
    console.error('No se pudieron leer los recuerdos locales:', error);
    return [];
  }
}

export function saveStoredMemories(memories: Memory[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memories));
  } catch (error) {
    // Suele ser QuotaExceededError. Antes pasaba siempre porque las fotos se
    // guardaban como data URLs base64; ahora solo se guardan URLs de Cloudinary.
    console.error('No se pudieron guardar los recuerdos locales:', error);
  }
}

export function getActiveUser(): 'Ariel' | 'Jazmin' {
  if (typeof window === 'undefined') return 'Ariel';
  try {
    return localStorage.getItem(ACTIVE_USER_KEY) === 'Jazmin' ? 'Jazmin' : 'Ariel';
  } catch {
    return 'Ariel';
  }
}

export function setActiveUser(user: 'Ariel' | 'Jazmin'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_USER_KEY, user);
  } catch {
    /* modo incognito: no es critico */
  }
}

// ----------------------------------------------------------------- API calls
async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return typeof data?.error === 'string' ? data.error : fallback;
  } catch {
    return fallback;
  }
}

export async function fetchAllMemories(): Promise<LoadResult> {
  try {
    const response = await fetch('/api/memories', { cache: 'no-store' });

    if (response.status === 401) {
      return { memories: getStoredMemories(), source: 'local', unauthorized: true };
    }
    if (!response.ok) throw new ApiError(await readError(response, 'Error al cargar'), response.status);

    const data = await response.json();
    const source: Source = data.source === 'supabase' ? 'supabase' : 'local';

    if (source === 'local') {
      return { memories: getStoredMemories(), source, unauthorized: false };
    }

    const memories = (data.memories ?? []) as Memory[];
    saveStoredMemories(memories); // cache offline
    return { memories, source, unauthorized: false };
  } catch (error) {
    console.warn('Sin conexion con el servidor, usando cache local', error);
    return { memories: getStoredMemories(), source: 'local', unauthorized: false };
  }
}

type MemoryDraft = Omit<Memory, 'id' | 'createdAt'>;

export async function createMemory(draft: MemoryDraft, source: Source): Promise<Memory> {
  if (source === 'local') {
    const created: Memory = {
      ...draft,
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    saveStoredMemories([created, ...getStoredMemories()]);
    return created;
  }

  const response = await fetch('/api/memories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });

  if (!response.ok) {
    throw new ApiError(await readError(response, 'No se pudo guardar el recuerdo'), response.status);
  }

  const { memory } = await response.json();
  return memory as Memory;
}

export async function updateMemory(memory: Memory, source: Source): Promise<Memory> {
  if (source === 'local') {
    saveStoredMemories(getStoredMemories().map((m) => (m.id === memory.id ? memory : m)));
    return memory;
  }

  const { id, createdAt, ...payload } = memory;
  void createdAt;

  const response = await fetch(`/api/memories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new ApiError(await readError(response, 'No se pudo actualizar el recuerdo'), response.status);
  }

  const data = await response.json();
  return (data.memory ?? memory) as Memory;
}

export async function deleteMemory(id: string, source: Source): Promise<void> {
  if (source === 'local') {
    saveStoredMemories(getStoredMemories().filter((m) => m.id !== id));
    return;
  }

  const response = await fetch(`/api/memories/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new ApiError(await readError(response, 'No se pudo eliminar el recuerdo'), response.status);
  }
}

// -------------------------------------------------------------------- sesion
export interface SessionState {
  gateEnabled: boolean;
  authenticated: boolean;
}

export async function fetchSessionState(): Promise<SessionState> {
  try {
    const response = await fetch('/api/session', { cache: 'no-store' });
    if (!response.ok) return { gateEnabled: false, authenticated: true };
    return (await response.json()) as SessionState;
  } catch {
    return { gateEnabled: false, authenticated: true };
  }
}

export async function submitAccessCode(code: string): Promise<void> {
  const response = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw new ApiError(await readError(response, 'Codigo incorrecto'), response.status);
  }
}

export async function signOut(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE' });
}
