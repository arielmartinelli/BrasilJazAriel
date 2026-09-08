'use client';

import { useEffect, useState } from 'react';

/**
 * Si hay conexión o no.
 *
 * `navigator.onLine` miente seguido: da true con WiFi conectado pero sin
 * salida a internet. Alcanza para decidir cuándo intentar, y el intento real
 * es el que manda: si falla, el recuerdo vuelve a la cola igual.
 */
export function useOnlineStatus(): boolean {
  // Arranca en true para no mostrar "sin conexión" por un instante durante la
  // hidratación, cuando todavía no se puede leer navigator.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return isOnline;
}
