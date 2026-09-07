import { NextResponse } from 'next/server';
import { hasValidSession } from '@/lib/server/session';
import { isAdminConfigured } from '@/lib/server/supabaseAdmin';
import { getMemoriesVersion } from '@/lib/server/memoriesRepo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Ruta de sondeo barata: el navegador pregunta cada pocos segundos si cambio
 * algo y solo baja los recuerdos completos cuando la firma es distinta.
 *
 * Se hace asi y no con Supabase Realtime porque Realtime va por la anon key,
 * que la migracion 001 dejo sin permisos a proposito. Volver a habilitarla
 * reabriria el acceso publico a la base.
 */
export async function GET() {
  if (!isAdminConfigured) {
    return NextResponse.json({ version: 'local' });
  }
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    return NextResponse.json({ version: await getMemoriesVersion() });
  } catch (error) {
    console.error('[api/memories/version]', error);
    return NextResponse.json({ error: 'No disponible' }, { status: 500 });
  }
}
