'use client';

import { useEffect, useState } from 'react';

/**
 * Retrasa un valor. El buscador filtraba en cada tecla; con muchos recuerdos
 * eso re-renderizaba el mapa entero en cada pulsacion.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
