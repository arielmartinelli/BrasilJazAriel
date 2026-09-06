import 'server-only';
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'nh_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 dias

const ACCESS_CODE = process.env.APP_ACCESS_CODE?.trim() ?? '';
const SESSION_SECRET = process.env.SESSION_SECRET?.trim() ?? '';

/**
 * Si no hay codigo de acceso configurado la app corre abierta.
 * Es el modo de desarrollo: comodo en local, inseguro en produccion.
 * `getGateStatus()` lo expone para poder avisarlo en la UI.
 */
export const isGateEnabled = ACCESS_CODE.length > 0 && SESSION_SECRET.length > 0;

function sign(payload: string): string {
  return createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
}

/** Comparacion en tiempo constante: no filtra el secreto por timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Igual hacemos una comparacion para no revelar la diferencia de largo.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const jti = randomBytes(12).toString('base64url');
  const payload = `${expiresAt}.${jti}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [expiresAt, jti, signature] = parts;
  if (!safeEqual(sign(`${expiresAt}.${jti}`), signature)) return false;
  const exp = Number(expiresAt);
  return Number.isFinite(exp) && exp > Date.now();
}

/** Valida el codigo que escribe la persona contra el configurado. */
export function isValidAccessCode(candidate: unknown): boolean {
  if (!isGateEnabled) return false;
  if (typeof candidate !== 'string') return false;
  return safeEqual(candidate.trim(), ACCESS_CODE);
}

export async function hasValidSession(): Promise<boolean> {
  // Sin gate configurado no hay nada que validar.
  if (!isGateEnabled) return true;
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions(maxAge: number = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,           // inaccesible desde JavaScript: inmune a XSS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const, // corta CSRF desde otros sitios
    path: '/',
    maxAge,
  };
}

export function getGateStatus() {
  return {
    enabled: isGateEnabled,
    // Aviso explicito para no dejar produccion abierta por olvido.
    misconfigured:
      process.env.NODE_ENV === 'production' && !isGateEnabled,
  };
}
