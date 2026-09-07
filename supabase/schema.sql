-- ==============================================================================
-- SCHEMA: NOSSA HISTORIA (Ariel, Jazmin & Bruno en Brasil)
-- Base de datos del diario privado de recuerdos.
-- ==============================================================================
-- MODELO DE SEGURIDAD
--   El navegador NUNCA habla directo con Postgres. Toda lectura y escritura
--   pasa por las rutas /api/* de Next.js, que usan la service role key
--   (variable SUPABASE_SERVICE_ROLE_KEY, solo servidor) y validan la sesion
--   antes de tocar nada.
--   Por eso los roles anon y authenticated no tienen NINGUN permiso aca.
--   Si en el futuro se agrega login con Supabase Auth, se pueden sumar
--   policies acotadas a auth.uid(); mientras tanto, cerrado es lo correcto.
--
--   Instalacion limpia: pegar este archivo en Supabase -> SQL Editor -> Run.
--   Base ya existente: usar supabase/migrations/001_cerrar_acceso_publico.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------ PERFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL CHECK (display_name IN ('Ariel', 'Jazmin')),
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- -------------------------------------------------------------------- ETAPAS
CREATE TABLE IF NOT EXISTS public.stages (
  id          TEXT PRIMARY KEY,
  order_num   INT  NOT NULL,
  title       TEXT NOT NULL,
  subtitle    TEXT NOT NULL,
  icon        TEXT NOT NULL,
  color       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

INSERT INTO public.stages (id, order_num, title, subtitle, icon, color, description)
VALUES
  ('01-viaje',        1, 'El viaje',            'Argentina a Brasil',        'car',      '#0284c7', 'Preparacion, despedidas, ruta en auto por Paso de los Libres y llegada a Brasil.'),
  ('02-mudanza',      2, 'La mudanza',          'Primeros dias y tramites',  'package',  '#ea580c', 'Alojamiento temporal, Bruno adaptandose, compras iniciales y tramites.'),
  ('03-hogar',        3, 'Nuestro nuevo hogar', 'Instalacion definitiva',    'home',     '#059669', 'Elegir el lugar, armar cada rincon, la cama de Bruno y hacer propia la casa.'),
  ('04-descubriendo', 4, 'Descubriendo Brasil', 'Playas, trilhas y sabores', 'palmtree', '#d97706', 'Playas paradisiacas, gastronomia local, senderos y lugares nuevos.'),
  ('05-vida',         5, 'Nuestra vida aca',    'Cotidianeidad y recuerdos', 'heart',    '#e11d48', 'Mates al atardecer, paseos con Bruno, amigos, trabajo y nuevos proyectos.')
ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title,
      subtitle = EXCLUDED.subtitle,
      icon = EXCLUDED.icon,
      color = EXCLUDED.color,
      description = EXCLUDED.description;

-- ----------------------------------------------------------------- RECUERDOS
CREATE TABLE IF NOT EXISTS public.memories (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 140),
  description   TEXT NOT NULL DEFAULT '',
  memory_date   DATE NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL CHECK (latitude  BETWEEN -90  AND 90),
  longitude     DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  location_name TEXT NOT NULL,
  stage_id      TEXT REFERENCES public.stages(id) ON DELETE RESTRICT,
  created_by    TEXT NOT NULL CHECK (created_by IN ('Ariel', 'Jazmin')),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_highlight  BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.memory_participants (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  memory_id        UUID REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  participant_name TEXT NOT NULL CHECK (participant_name IN ('Ariel', 'Jazmin', 'Bruno')),
  created_at       TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE (memory_id, participant_name)
);

CREATE TABLE IF NOT EXISTS public.memory_media (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  memory_id   UUID REFERENCES public.memories(id) ON DELETE CASCADE NOT NULL,
  media_type  TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
  url         TEXT NOT NULL CHECK (url ~ '^https://'),
  caption     TEXT,
  duration_seconds NUMERIC,
  order_index INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- ------------------------------------------------------------------- INDICES
CREATE INDEX IF NOT EXISTS idx_memories_date       ON public.memories (memory_date DESC);
CREATE INDEX IF NOT EXISTS idx_memories_stage      ON public.memories (stage_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_by ON public.memories (created_by);
CREATE INDEX IF NOT EXISTS idx_participants_memory ON public.memory_participants (memory_id);
CREATE INDEX IF NOT EXISTS idx_media_memory_order  ON public.memory_media (memory_id, order_index);

-- ------------------------------------------------------- updated_at automatico
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_memories_updated_at ON public.memories;
CREATE TRIGGER trg_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- RLS activo y CERO policies: nadie con anon key o sesion de usuario puede
-- leer ni escribir. Solo service_role (que saltea RLS) llega a los datos,
-- y esa clave vive unicamente en el servidor.
-- =============================================================================
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_media        ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles            FROM anon, authenticated;
REVOKE ALL ON public.stages              FROM anon, authenticated;
REVOKE ALL ON public.memories            FROM anon, authenticated;
REVOKE ALL ON public.memory_participants FROM anon, authenticated;
REVOKE ALL ON public.memory_media        FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- =============================================================================
-- STORAGE
-- Las fotos viven en Cloudinary. El bucket queda creado y privado por si algun
-- dia se migra, pero sin ninguna policy que lo abra.
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('memories_vault', 'memories_vault', false)
ON CONFLICT (id) DO UPDATE SET public = false;
