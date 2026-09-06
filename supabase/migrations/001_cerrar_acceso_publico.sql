-- ==============================================================================
-- MIGRACION 001 - CERRAR EL ACCESO PUBLICO A LA BASE
-- ==============================================================================
-- PROBLEMA QUE ARREGLA:
--   El schema original tenia policies "TO anon USING (true)" para SELECT,
--   INSERT, UPDATE y DELETE. La anon key viaja dentro del JavaScript que
--   descarga cualquier visitante, asi que cualquiera que abriera el sitio
--   podia leer, modificar y BORRAR todos los recuerdos desde la consola
--   del navegador.
--
-- COMO QUEDA:
--   Los roles anon y authenticated pierden todo acceso a las tablas.
--   La app ahora escribe y lee desde las rutas /api/* del servidor, que usan
--   la service role key (que nunca sale del servidor) y que validan la sesion
--   antes de tocar la base.
--
-- COMO APLICARLA:
--   Supabase -> SQL Editor -> pegar este archivo -> Run.
-- ==============================================================================

BEGIN;

-- 1. Borrar las policies permisivas anteriores.
DROP POLICY IF EXISTS "Acceso lectura recuerdos"        ON public.memories;
DROP POLICY IF EXISTS "Acceso creación recuerdos"       ON public.memories;
DROP POLICY IF EXISTS "Acceso actualización recuerdos"  ON public.memories;
DROP POLICY IF EXISTS "Acceso eliminación recuerdos"    ON public.memories;
DROP POLICY IF EXISTS "Lectura y escritura participantes" ON public.memory_participants;
DROP POLICY IF EXISTS "Lectura y escritura media"       ON public.memory_media;
DROP POLICY IF EXISTS "Lectura de etapas"               ON public.stages;

-- 2. RLS activo en todas las tablas. Sin policies = nadie pasa,
--    salvo service_role, que por diseno saltea RLS.
ALTER TABLE public.memories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_media         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;

-- 3. Cinturon y tiradores: quitar tambien los permisos a nivel tabla,
--    para que ni un futuro "policy permisiva por error" abra la puerta.
REVOKE ALL ON public.memories            FROM anon, authenticated;
REVOKE ALL ON public.memory_participants FROM anon, authenticated;
REVOKE ALL ON public.memory_media        FROM anon, authenticated;
REVOKE ALL ON public.stages              FROM anon, authenticated;
REVOKE ALL ON public.profiles            FROM anon, authenticated;

-- Y que las tablas nuevas hereden lo mismo.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- 4. Sacar estas tablas de la publicacion de realtime: el canal realtime
--    usa la anon key y volveria a exponer los datos.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.memories;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Indices para las consultas que realmente hace la app.
CREATE INDEX IF NOT EXISTS idx_memories_date       ON public.memories (memory_date DESC);
CREATE INDEX IF NOT EXISTS idx_memories_stage      ON public.memories (stage_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_by ON public.memories (created_by);
CREATE INDEX IF NOT EXISTS idx_participants_memory ON public.memory_participants (memory_id);
CREATE INDEX IF NOT EXISTS idx_media_memory_order  ON public.memory_media (memory_id, order_index);

-- 6. Restricciones de integridad que faltaban.
ALTER TABLE public.memories
  DROP CONSTRAINT IF EXISTS memories_lat_range,
  DROP CONSTRAINT IF EXISTS memories_lng_range,
  DROP CONSTRAINT IF EXISTS memories_title_len;

ALTER TABLE public.memories
  ADD CONSTRAINT memories_lat_range  CHECK (latitude  BETWEEN -90  AND 90),
  ADD CONSTRAINT memories_lng_range  CHECK (longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT memories_title_len  CHECK (char_length(title) BETWEEN 1 AND 140);

-- 7. Marca de ultima edicion, util para sincronizar entre dispositivos.
ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL;

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

-- 8. Storage: el bucket queda privado y sin policy para anon.
UPDATE storage.buckets SET public = false WHERE id = 'memories_vault';
DROP POLICY IF EXISTS "Acceso privado a memories_vault" ON storage.objects;

COMMIT;

-- ==============================================================================
-- VERIFICACION (correr despues, deberia devolver 0 filas):
--   SELECT tablename, policyname, roles FROM pg_policies
--   WHERE schemaname = 'public' AND 'anon' = ANY(roles);
-- ==============================================================================
