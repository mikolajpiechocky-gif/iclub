// Przechowywanie tokenów OLX (singleton). WYŁĄCZNIE przez service_role — refresh_token
// nigdy nie trafia do klienta. Automatyczne odświeżanie access_tokenu.
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/integrations/olx";

export interface OlxIntegration {
  refresh_token: string | null;
  access_token: string | null;
  access_expires_at: string | null;
  olx_user_id: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
}

export async function getOlxIntegration(): Promise<OlxIntegration | null> {
  if (!isServiceRoleConfigured()) return null;
  const s = createAdminClient();
  const { data } = await s.from("olx_integration").select("*").eq("id", true).maybeSingle();
  return (data as OlxIntegration) ?? null;
}

export async function saveOlxTokens(t: {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  olx_user_id?: string | null;
}): Promise<void> {
  const s = createAdminClient();
  const patch: Record<string, unknown> = {
    id: true,
    access_token: t.access_token,
    access_expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
    connected_at: new Date().toISOString(),
  };
  if (t.refresh_token) patch.refresh_token = t.refresh_token;
  if (t.olx_user_id !== undefined) patch.olx_user_id = t.olx_user_id;
  const { error } = await s.from("olx_integration").upsert(patch);
  if (error) throw new Error(error.message);
}

// Ważny access_token — jeśli wygasł, odświeża refresh_tokenem i zapisuje.
export async function getValidAccessToken(): Promise<string | null> {
  const it = await getOlxIntegration();
  if (!it?.refresh_token) return null;
  if (it.access_token && it.access_expires_at && new Date(it.access_expires_at).getTime() > Date.now()) {
    return it.access_token;
  }
  const t = await refreshAccessToken(it.refresh_token);
  await saveOlxTokens({ access_token: t.access_token, refresh_token: t.refresh_token, expires_in: t.expires_in });
  return t.access_token;
}

export async function markOlxSynced(): Promise<void> {
  const s = createAdminClient();
  await s.from("olx_integration").update({ last_sync_at: new Date().toISOString() }).eq("id", true);
}
