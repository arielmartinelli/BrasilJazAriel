# Nossa História: Ariel, Jazmín & Bruno en Brasil 🇧🇷🐶

Diario visual interactivo, privado y móvil-first para documentar la mudanza y nueva vida en Brasil.

---

## 🌴 Características Principales

1. **🗺️ Mapa Interactivo de Brasil**:
   - Marcadores personalizados con fotos y avatares según el creador (**Ariel** 👨‍💻, **Jazmín** 👩‍🎨 o si estuvo **Bruno** 🐾).
   - Animación `flyTo` suave hacia cada lugar al tocarlo o seleccionarlo.
   - Selector de estilo de mapa: Tropical a color, Modo Noche y Claro minimalista.
   - Botón de centrado rápido en Florianópolis.

2. **📖 Modo "Nuestra Historia" (Scrollytelling Interactivo)**:
   - Narrativa cronológica interactiva que avanza paso a paso por las 5 etapas:
     - **01 — El viaje 🚗**: Despedida y viaje en auto por Paso de los Libres (Ruta 14).
     - **02 — La mudanza 📦**: Trámites, colchón inflable y primeras cajas.
     - **03 — Nuestro nuevo hogar 🏠**: Balcón soñado en Campeche y nuevo espacio para Bruno.
     - **04 — Descubriendo Brasil 🌴**: Primer chapuzón en el mar y trilhas salvajes.
     - **05 — Nuestra vida acá ❤️**: Mates al atardecer, rutina y felicidad construida.
   - **Auto-Historia**: Botón de reproducción automática que va sobrevolando el mapa y mostrando las fotos como una película de recuerdos.

3. **📸 Subida Rápida Móvil-First (`+ Agregar recuerdo`)**:
   - Pensado para cargar en el momento desde el teléfono:
     - Título y fecha.
     - Selector táctil de ubicación en el mapa o botón **"📍 Mi ubicación GPS"** para detectar dónde estás.
     - Selección de etapa y protagonistas (Ariel, Jazmín, Bruno).
     - Subida de múltiples fotos y videos con vista previa inmediata.
     - ¡Lluvia de confeti festivo 🎉 al guardar!

4. **🗂️ Muro / Galería y Filtros Inteligentes**:
   - Tarjetas estilo polaroid con glassmorphism y hover 3D.
   - Filtros instantáneos:
     - Por etapa (01 al 05).
     - Por autor (Ariel, Jazmín, Ambos).
     - **🐾 Solo con Bruno**: para ver rápidamente todos los momentos con el perro.
     - Buscador por nombre de playa o palabra clave.

5. **🔐 Privacidad & Supabase Ready**:
   - Funciona de inmediato sin configuración previa (con almacenamiento local y datos de ejemplo).
   - Incluye el script SQL completo en `supabase/schema.sql` con **Row Level Security (RLS)** y Storage privado para cuando quieran sincronizarlo en la nube entre sus dispositivos.

---

## 🚀 Inicio Rápido

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Iniciar en modo desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador o desde tu celular conectado a la misma red WiFi (`http://<tu-ip-local>:3000`).

3. **Compilar para producción**:
   ```bash
   npm run build
   npm run start
   ```

---

## 🗄️ Conectar Supabase (Opcional)

Si deseas sincronizar fotos y datos entre varios teléfonos y computadoras con base de datos en la nube:

1. Crea un proyecto gratuito en [Supabase](https://supabase.com/).
2. Ve al **SQL Editor** en el panel de Supabase y pega el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. Copia las claves de tu proyecto y crea un archivo `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   ```
4. Reinicia la aplicación (`npm run dev`).
