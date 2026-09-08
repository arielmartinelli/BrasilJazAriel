# Nossa História — Ariel, Jazmín & Bruno en Brasil 🇧🇷🐶

Diario visual privado, pensado para el celular, donde Ariel y Jazmín documentan la mudanza y la nueva vida en Brasil.

---

## Qué hace

**🗺️ Mapa interactivo**
Cada recuerdo es un pin con su foto. Vuelo suave al tocarlo, agrupamiento automático cuando hay muchos pines juntos, **ruta del viaje en auto** trazada sobre el mapa, botón de GPS y encuadre automático para ver todo. Cinco capas, todas gratuitas y sin API key: **Satélite** (Esri), **Calles y playas** y **Claro minimalista** (CARTO), **Relieve y trilhas** (Esri) y **Modo noche** (CARTO Dark Matter).

**📖 Historia**
Recorrido cronológico capítulo por capítulo, con reproducción automática que sobrevuela el mapa como una película de recuerdos. Se navega también con las flechas del teclado y la barra espaciadora.

**📸 Cargar un momento**
Título, fecha, etapa, quiénes estuvieron, anécdota y fotos o videos. La ubicación se elige tocando el mapa, con el **GPS del teléfono**, buscando el lugar por nombre o pegando un link de Google Maps. Confeti al guardar.

**🗂️ Muro**
Grilla de tarjetas o **línea de tiempo** agrupada por mes. Filtros por etapa, por autor, **🐾 solo con Bruno**, buscador y orden (más recientes o cronológico).

**📊 Resumen del viaje**
Días de aventura, kilómetros entre paradas, lugares visitados, fotos, videos y momentos con Bruno.

**📴 Funciona sin señal**
La app abre aunque no haya datos, y podés cargar un recuerdo completo —con fotos, videos y audios— desde una playa sin cobertura. Todo queda guardado en el teléfono y se sube solo cuando vuelve la conexión. Los recuerdos en espera se ven en el mapa y en el muro con el cartel "En espera".

**🔗 Compartir**
Cada recuerdo tiene su enlace propio: quien lo abre entra directo a ese momento.

**🔐 Privado de verdad**
Un código compartido protege el diario. Los datos viven en Supabase con la base cerrada a todo acceso externo, y las fotos en Cloudinary.

---

## Arrancar

```bash
npm install
npm run dev          # http://localhost:3000
```

Desde el celular en la misma red WiFi: `http://<tu-ip-local>:3000`

Antes de subir a producción:

```bash
npm run check        # typecheck + lint
npm run build
```

---

## Configuración

Copiá `.env.example` a `.env.local` y completá:

```env
# Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."        # SECRETO, solo servidor

# Cloudinary → Dashboard
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."            # SECRETO, solo servidor
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."

# Acceso privado
APP_ACCESS_CODE="..."                  # el código que comparten Ariel y Jazmín
SESSION_SECRET="..."                   # node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

En Vercel, las mismas variables van en **Settings → Environment Variables**.

> Sin `APP_ACCESS_CODE` la app corre en **modo abierto**: cómodo para desarrollar en local, inseguro en producción.
> Sin Supabase configurado, la app funciona igual pero guarda todo en el navegador de ese dispositivo (aparece un aviso "Modo local").

### Base de datos

- Proyecto nuevo: pegá `supabase/schema.sql` en Supabase → SQL Editor → Run.
- Proyecto que ya existía: corré `supabase/migrations/001_cerrar_acceso_publico.sql`. **Es obligatorio**: cierra el acceso público que tenía la base.

---

## Cómo está armado

```
app/
  page.tsx              vista principal (mapa · historia · muro)
  api/session/          código de acceso → cookie firmada
  api/memories/         CRUD, valida sesión y entrada
  api/upload/           subida a Cloudinary con límites y validación
  layout.tsx  error.tsx  loading.tsx  not-found.tsx  robots.ts
components/
  map/        mapa interactivo y selector de ubicación
  memories/   tarjeta · línea de tiempo · filtros · detalle · formulario
  story/      recorrido cronológico
  stats/      resumen del viaje
  ui/         navbar · barra inferior · puerta de acceso · loader
lib/
  server/     sesión, rate limit, Supabase admin, repositorio  (nunca llega al navegador)
  media.ts    miniaturas de Cloudinary y escapado de HTML
  validation.ts  esquemas Zod compartidos
  stats.ts  dates.ts  geoUtils.ts  alerts.ts  types.ts  memoryStore.ts
lib/offline/  cola de subida en IndexedDB para cuando no hay señal
public/sw.js  service worker: la app abre sin conexión
hooks/        accesibilidad de modales · debounce · estado de conexión
proxy.ts      Content Security Policy con nonce por request
docs/         SEGURIDAD.md · RENDIMIENTO.md
```

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Leaflet · Framer Motion · Supabase · Cloudinary · Zod

---

## Documentación

- [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) — auditoría, qué se cerró y **qué tenés que hacer vos**
- [`docs/RENDIMIENTO.md`](docs/RENDIMIENTO.md) — rendimiento, accesibilidad y mantenimiento
