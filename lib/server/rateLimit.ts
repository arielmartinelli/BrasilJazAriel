import 'server-only';

type Bucket = { count: number; resetAt: number };

/**
 * Rate limit en memoria por IP.
 *
 * Limitacion conocida: en Vercel cada instancia serverless tiene su propio
 * mapa, asi que el limite real es por instancia. Alcanza para frenar un abuso
 * casual o un script suelto, que es el riesgo de un diario privado. Si el
 * sitio se vuelve publico, migrar a Upstash Redis o Vercel KV.
 */
const buckets = new Map<string, Bucket>();
const MAX_TRACKED_IPS = 5000;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();

  // Limpieza perezosa para que el mapa no crezca sin techo.
  if (buckets.size > MAX_TRACKED_IPS) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}
