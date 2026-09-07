-- ==============================================================================
-- MIGRACION 002 - PERMITIR AUDIOS
-- ==============================================================================
-- memory_media.media_type solo aceptaba 'image' y 'video'. Cualquier intento de
-- guardar un audio fallaba con violacion de CHECK constraint.
--
-- Aplicar en: Supabase -> SQL Editor -> Run
-- ==============================================================================

BEGIN;

ALTER TABLE public.memory_media
  DROP CONSTRAINT IF EXISTS memory_media_media_type_check;

ALTER TABLE public.memory_media
  ADD CONSTRAINT memory_media_media_type_check
  CHECK (media_type IN ('image', 'video', 'audio'));

-- Duracion en segundos, para mostrar "0:47" en el reproductor sin tener que
-- descargar el archivo entero primero.
ALTER TABLE public.memory_media
  ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC;

COMMIT;
