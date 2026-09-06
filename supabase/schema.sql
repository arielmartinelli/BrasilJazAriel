-- ==============================================================================
-- SCHEMA: NOSSA HISTÓRIA (Ariel, Jazmín & Bruno en Brasil 🇧🇷🐶)
-- Base de datos para el diario de vida y recuerdos familiares privados
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE PERFILES (Ariel y Jazmín)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL CHECK (display_name IN ('Ariel', 'Jazmin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. TABLA DE ETAPAS (01 al 05)
CREATE TABLE IF NOT EXISTS public.stages (
  id TEXT PRIMARY KEY,
  order_num INT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar las 5 etapas por defecto
INSERT INTO public.stages (id, order_num, title, subtitle, icon, color, description)
VALUES 
  ('01-viaje', 1, 'El viaje', 'Argentina → Brasil', '🚗', '#0284c7', 'Preparación, despedidas, ruta en auto por Paso de los Libres y llegada a Brasil.'),
  ('02-mudanza', 2, 'La mudanza', 'Primeros días & trámites', '📦', '#ea580c', 'Alojamiento temporal, Bruno adaptándose, compras iniciales y trámites.'),
  ('03-hogar', 3, 'Nuestro nuevo hogar', 'Instalación definitiva', '🏠', '#16a34a', 'Elegir el lugar, armar cada rincón, la cama de Bruno y hacer propia la casa.'),
  ('04-descubriendo', 4, 'Descubriendo Brasil', 'Playas, trilhas & sabores', '🌴', '#eab308', 'Playas paradisíacas, caipirinhas, acaí, senderos y perdernos en lugares nuevos.'),
  ('05-vida', 5, 'Nuestra vida acá', 'Cotidianeidad & felicidad', '❤️', '#e11d48', 'Mates al atardecer, paseos con Bruno, amigos, trabajo y construir nuestro futuro.')
ON CONFLICT (id) DO NOTHING;

-- 4. TABLA DE RECUERDOS (MEMORIES)
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  memory_date DATE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name TEXT NOT NULL,
  stage_id TEXT REFERENCES public.stages(id) ON DELETE RESTRICT,
  created_by TEXT NOT NULL CHECK (created_by IN ('Ariel', 'Jazmin')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_highlight BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLA DE PARTICIPANTES POR RECUERDO
CREATE TABLE IF NOT EXISTS public.memory_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  memory_id UUID REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  participant_name TEXT NOT NULL CHECK (participant_name IN ('Ariel', 'Jazmin', 'Bruno')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(memory_id, participant_name)
);

-- 6. TABLA DE MULTIMEDIA (FOTOS Y VIDEOS - URLs DE CLOUDINARY)
CREATE TABLE IF NOT EXISTS public.memory_media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  memory_id UUID REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  url TEXT NOT NULL,
  caption TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- REGLAS DE ACCESO (RLS) PARA LA FAMILIA
-- ==============================================================================

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;

-- Políticas para Memories
CREATE POLICY "Acceso lectura recuerdos"
  ON public.memories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Acceso creación recuerdos"
  ON public.memories FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Acceso actualización recuerdos"
  ON public.memories FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Acceso eliminación recuerdos"
  ON public.memories FOR DELETE
  TO anon, authenticated
  USING (true);

-- Políticas para Participantes
CREATE POLICY "Lectura y escritura participantes"
  ON public.memory_participants FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para Media (Cloudinary URLs)
CREATE POLICY "Lectura y escritura media"
  ON public.memory_media FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas para Stages
CREATE POLICY "Lectura de etapas"
  ON public.stages FOR SELECT
  TO anon, authenticated
  USING (true);

-- ==============================================================================
-- STORAGE BUCKET PARA FOTOS Y VIDEOS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('memories_vault', 'memories_vault', false)
ON CONFLICT (id) DO NOTHING;

-- Regla de acceso al Storage: sólo Ariel y Jazmín autenticados
CREATE POLICY "Acceso privado a memories_vault"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'memories_vault')
  WITH CHECK (bucket_id = 'memories_vault');
