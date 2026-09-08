# Rendimiento y mantenimiento — Nossa História

---

## 1. Lo que estaba costando caro

**Fotos a tamaño original en todos lados.** Un pin del mapa mide 44 px y cargaba la foto de 4 MB del celular. Una tarjeta del muro mide 420 px y cargaba la misma. Con 30 recuerdos, abrir la app en 4G descargaba más de 100 MB.

*Arreglo:* `lib/media.ts` reescribe la URL de Cloudinary para que el CDN entregue el tamaño justo (`c_fill,w_96,q_auto:good,f_auto,dpr_auto`). Pines a 96 px, tarjetas a 640 px, miniaturas a 200 px, visor a 1400 px. Es un cambio de URL: no hay que volver a subir nada. **Reducción estimada del peso de imágenes: ~95 %.**

**Polling cada 10 segundos, siempre.** Incluso en modo local (releyendo `localStorage` sin sentido) y con la pestaña en segundo plano. Cada ciclo serializaba los dos arrays completos con `JSON.stringify` para compararlos.

*Arreglo:* solo con Supabase conectado, solo con la pestaña visible, cada 30 s, y comparando una firma corta en vez de serializar todo. Además refresca al volver a la pestaña.

**Dos mapas de Leaflet vivos a la vez.** La vista Historia montaba su propia instancia de `InteractiveMap`, con su propia descarga de tiles.

*Arreglo:* la vista Historia desactiva el agrupamiento de pines y comparte configuración. Sigue habiendo dos instancias (son vistas independientes), pero ya no compiten por ancho de banda con tiles duplicados en el mismo viewport.

**Vuelos del mapa en bucle.** El efecto de `StoryTour` dependía del *objeto* recuerdo, que se recreaba en cada render porque el `sort` no estaba memorizado. Cada render disparaba una animación nueva.

*Arreglo:* `useMemo` sobre el orden cronológico y dependencia por `id`.

**Filtrado en cada tecla.** Escribir en el buscador re-renderizaba mapa y lista completos, letra por letra.

*Arreglo:* debounce de 220 ms (`hooks/useDebouncedValue.ts`) y filtrado memorizado.

**`setTimeout` encadenados para redimensionar el mapa.** Tres timeouts a ciegas (0, 150, 400 ms) que fallaban igual si el panel tardaba más.

*Arreglo:* `ResizeObserver`, que reacciona al tamaño real.

**Paquete muerto.** `maplibre-gl` estaba instalado y no se importaba en ningún lado. Eliminado.

**Escaneo de iconos.** `optimizePackageImports` para `lucide-react` y `framer-motion`: solo entra al bundle lo que se usa.

---

## 2. Accesibilidad (era el punto más flojo)

- **Se quitó `maximumScale: 1`** del viewport. Bloquear el zoom incumple WCAG 1.4.4 y deja sin salida a quien necesita agrandar el texto.
- **Se quitó `select-none` global**, que impedía copiar cualquier texto de la app.
- **Modales:** Escape cierra, el fondo no scrollea, el foco queda atrapado adentro y vuelve al botón que lo abrió (`hooks/useModalA11y.ts`). Antes no había nada de esto.
- **Anillo de foco visible** en toda la app. Varios controles usaban `focus:outline-none` sin reemplazo: navegar con teclado era a ciegas.
- **El menú de capas del mapa se abría con `:hover`** — imposible de usar en el celular. Ahora es click, con `aria-expanded`.
- **Tipografía:** los `text-[10px]` y `text-[11px]` subieron a 12-14 px.
- Tarjetas convertidas en `<button>` reales, `aria-pressed` en los filtros, `aria-current` en la navegación, enlace "Saltar al contenido".
- `prefers-reduced-motion` respetado, incluido el confeti.

---

## 3. Sin conexión

La app ahora abre sin datos y deja cargar recuerdos igual.

- **`public/sw.js`** — service worker escrito a mano, sin plugin, para no depender de que una librería siga al día con Next 16 y Turbopack. Red primero para el HTML (siempre ves lo último si hay señal, y abre igual si no), caché primero para los estáticos con hash, las fotos de Cloudinary y los tiles del mapa. **`/api` nunca se cachea**: devolver recuerdos viejos como si fueran actuales sería peor que fallar.
- **`lib/offline/`** — cola en IndexedDB, no en localStorage: hay que guardar las fotos y videos originales, que no entran en los ~5 MB de localStorage ni sobreviven a ser texto.
- El orden al sincronizar importa: suben los archivos, después se guarda el recuerdo, y recién con eso confirmado se saca de la cola. Al revés, un corte a mitad de camino perdería el recuerdo.
- Un candado evita que dos disparos simultáneos (volvió la red + la persona tocó "Subir ahora") suban lo mismo dos veces.
- Los recuerdos en espera se ven en el mapa y en el muro leyendo las fotos del archivo local, y no se pueden editar ni compartir hasta que existan en la nube.

**Límite conocido:** el service worker solo se registra en producción. En `npm run dev` la cola de subida funciona igual, pero la app no abre sin conexión.

## 4. Mantenimiento

**Antes de cada deploy**
```bash
npm run check     # typecheck + lint, ambos en cero
npm run build
```

**Cada tanto**
- `npm outdated` una vez por mes. Next, React y Supabase son los que más se mueven.
- `npm audit` después de cada instalación nueva.
- Mirar la cuota de Cloudinary (plan free: 25 créditos). Los límites de subida ya la protegen, pero conviene ver el número.
- Revisar en Supabase que no hayan aparecido policies para `anon` (la consulta está en `docs/SEGURIDAD.md`).

**Cuando crezca el álbum**
- Más de ~200 recuerdos: paginar `GET /api/memories` (hoy trae hasta 2000 de una).
- Más de ~500: virtualizar la grilla del muro.
- El agrupamiento de pines ya está resuelto con `leaflet.markercluster`.

**Al eliminar recuerdos**
Las fotos quedan en Cloudinary ocupando cuota. La ruta de subida ya devuelve el `publicId`; guardarlo en `memory_media` y borrar por ahí es el próximo paso natural.

---

## 5. Lo que no se midió

No hay Lighthouse ni Web Vitals reales en este informe: la máquina donde se trabajó no tiene salida a internet, así que ni Google Fonts ni Cloudinary ni los tiles del mapa se pueden cargar para medir de verdad. Las mejoras de arriba son de las que se razonan mirando el código (peso de imágenes, renders, requests), no de las que se estiman.

Para medir en serio: deployar y correr Lighthouse contra la URL de Vercel, o `npx unlighthouse --site <url>`.
