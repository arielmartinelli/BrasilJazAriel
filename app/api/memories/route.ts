import { NextResponse } from 'next/server';
import { hasValidSession } from '@/lib/server/session';
import { getClientIp, rateLimit } from '@/lib/server/rateLimit';
import { isAdminConfigured } from '@/lib/server/supabaseAdmin';
import { insertMemory, listMemories } from '@/lib/server/memoriesRepo';
import { firstIssueMessage, memoryInputSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isAdminConfigured) {
    // Sin Supabase la app funciona en modo local (localStorage). No es un error.
    return NextResponse.json({ memories: [], source: 'local' });
  }
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    return NextResponse.json({ memories: await listMemories(), source: 'supabase' });
  } catch (error) {
    console.error('[api/memories] GET', error);
    return NextResponse.json({ error: 'No se pudieron cargar los recuerdos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!isAdminConfigured) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 503 });
  }

  const limit = rateLimit(`memories:write:${getClientIp(request)}`, 60, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud invalida' }, { status: 400 });
  }

  const parsed = memoryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 422 });
  }

  try {
    return NextResponse.json({ memory: await insertMemory(parsed.data) }, { status: 201 });
  } catch (error) {
    // El detalle va al log del servidor, nunca a la respuesta.
    console.error('[api/memories] POST', error);
    return NextResponse.json({ error: 'No se pudo guardar el recuerdo' }, { status: 500 });
  }
}
