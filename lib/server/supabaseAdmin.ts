import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const isAdminConfigured = Boolean(url && serviceKey);

/**
 * Cliente con service role: saltea RLS. SOLO puede usarse desde rutas de API
 * que ya validaron la sesion. Nunca importarlo desde un componente cliente
 * (el import de 'server-only' hace fallar el build si eso pasa).
 */
export const supabaseAdmin: SupabaseClient | null = isAdminConfigured
  ? createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
