'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker que hace que la app abra sin señal.
 *
 * Solo en producción: en desarrollo una caché agresiva hace perder tiempo
 * persiguiendo cambios que sí se guardaron pero el navegador no muestra.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('No se pudo registrar el service worker:', error);
      });
    };

    // Después del load: registrarlo antes compite por ancho de banda con
    // los recursos que la persona está esperando ver.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
