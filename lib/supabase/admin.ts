// Klient administracyjny Supabase (service_role). WYŁĄCZNIE po stronie serwera —
// omija RLS, więc importujemy go tylko w akcjach owner-only. Bez klucza nieaktywny.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isServiceRoleConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

export function createAdminClient() {
  return createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
