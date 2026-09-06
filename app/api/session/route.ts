import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  createSessionToken,
  getGateStatus,
  hasValidSession,
  isValidAccessCode,
  sessionCookieOptions,
} from '@/lib/server/session';
import { getClientIp, rateLimit } from '@/lib/server/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Estado del acceso: lo usa la UI para decidir si muestra el candado. */
export async function GET() {
  const gate = getGateStatus();
  return NextResponse.json({
    gateEnabled: gate.enabled,
    authenticated: await hasValidSession(),
  });
}

/** Canje del codigo compartido por una cookie de sesion firmada. */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  // 8 intentos cada 10 minutos por IP: hace inviable el fuerza bruta.
  const limit = rateLimit(`session:${ip}`, 8, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud invalida' }, { status: 400 });
  }

  const code = (body as { code?: unknown } | null)?.code;

  if (!isValidAccessCode(code)) {
    // Mismo mensaje siempre: no revelamos si el gate esta activo ni el largo.
    return NextResponse.json({ error: 'Codigo incorrecto' }, { status: 401 });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
  return NextResponse.json({ ok: true });
}

/** Cerrar sesion en este dispositivo. */
export async function DELETE() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return NextResponse.json({ ok: true });
}
