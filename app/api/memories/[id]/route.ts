import { NextResponse } from 'next/server';
import { hasValidSession } from '@/lib/server/session';
import { getClientIp, rateLimit } from '@/lib/server/rateLimit';
import { isAdminConfigured } from '@/lib/server/supabaseAdmin';
import { deleteMemoryRow, updateMemoryRow } from '@/lib/server/memoriesRepo';
import { firstIssueMessage, memoryInputSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

async function guard(request: Request) {
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
  return null;
}

export async function PUT(request: Request, { params }: Context) {
  const blocked = await guard(request);
  if (blocked) return blocked;

  const { id } = await params;

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
    return NextResponse.json({ memory: await updateMemoryRow(id, parsed.data) });
  } catch (error) {
    console.error('[api/memories/:id] PUT', error);
    return NextResponse.json({ error: 'No se pudo actualizar el recuerdo' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const blocked = await guard(request);
  if (blocked) return blocked;

  const { id } = await params;
  try {
    await deleteMemoryRow(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/memories/:id] DELETE', error);
    return NextResponse.json({ error: 'No se pudo eliminar el recuerdo' }, { status: 500 });
  }
}
