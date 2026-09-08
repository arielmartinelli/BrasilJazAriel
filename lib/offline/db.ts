'use client';

/**
 * Almacen local para lo que todavia no se pudo subir.
 *
 * Va en IndexedDB y no en localStorage por dos razones: localStorage tiene un
 * techo de ~5 MB y solo guarda texto, mientras que acá hay que guardar las
 * fotos y los videos originales hasta que vuelva la señal. IndexedDB guarda
 * Blobs tal cual y tiene espacio de sobra.
 *
 * Sin dependencias: la API nativa es fea pero son cuatro operaciones.
 */

const DB_NAME = 'nossa_historia_offline';
const DB_VERSION = 1;
const STORE = 'pending_memories';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB no disponible'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la base local'));
  });

  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = work(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Error en la base local'));
      })
  );
}

export function idbPut<T>(value: T): Promise<IDBValidKey> {
  return run('readwrite', (store) => store.put(value));
}

export function idbGetAll<T>(): Promise<T[]> {
  return run<T[]>('readonly', (store) => store.getAll() as IDBRequest<T[]>);
}

export function idbDelete(id: string): Promise<undefined> {
  return run('readwrite', (store) => store.delete(id) as IDBRequest<undefined>);
}

export function idbClear(): Promise<undefined> {
  return run('readwrite', (store) => store.clear() as IDBRequest<undefined>);
}
