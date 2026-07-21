// Ogłoszenia OLX: odczyt (owner, RLS) + synchronizacja (service_role).
// Zbiera wyświetlenia i odsłony numeru; trzyma poprzednie wartości do policzenia
// przyrostu od ostatniej synchronizacji. Mapowanie defensywne (potwierdzimy na danych).
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getValidAccessToken } from "./olx";
import { getAdverts, getAdvertStatistics } from "@/lib/integrations/olx";

export interface OlxAdvert {
  olx_id: string;
  title: string | null;
  status: string | null;
  url: string | null;
  valid_to: string | null;
  olx_created_at: string | null;
  views: number;
  phones: number;
  prev_views: number | null;
  prev_phones: number | null;
  prev_synced_at: string | null;
  last_synced_at: string;
}

export interface OlxAdvertsSyncResult {
  ok: boolean;
  synced: number;
  error?: string;
}

const pick = (obj: unknown, ...keys: string[]): unknown => {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur && typeof cur === "object" && k in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[k];
    else return undefined;
  }
  return cur;
};
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function listOlxAdverts(): Promise<OlxAdvert[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("olx_adverts").select("*").order("valid_to", { ascending: true, nullsFirst: false });
  if (error) return [];
  return (data ?? []) as OlxAdvert[];
}

export async function syncOlxAdverts(): Promise<OlxAdvertsSyncResult> {
  const token = await getValidAccessToken();
  if (!token) return { ok: false, synced: 0, error: "OLX niepołączone — najpierw „Połącz OLX” w Ustawieniach." };

  const s = createAdminClient();
  let synced = 0;
  let offset = 0;
  try {
    for (let page = 0; page < 50; page++) {
      const resp = (await getAdverts(token, offset, 100)) as Record<string, unknown>;
      const adverts = ((resp?.data as unknown[]) ?? []) as Record<string, unknown>[];
      if (!adverts.length) break;

      for (const a of adverts) {
        const olxId = String(pick(a, "id") ?? "");
        if (!olxId) continue;

        let views = 0;
        let phones = 0;
        try {
          const st = (await getAdvertStatistics(token, olxId)) as Record<string, unknown>;
          views = num(pick(st, "data", "views") ?? pick(st, "views") ?? pick(st, "data", "impressions"));
          phones = num(pick(st, "data", "phones") ?? pick(st, "phones") ?? pick(st, "data", "phone_views") ?? pick(st, "phone_views"));
        } catch {
          /* ogłoszenie bez statystyk — zostają zera */
        }

        const { data: prev } = await s.from("olx_adverts").select("views, phones, last_synced_at").eq("olx_id", olxId).maybeSingle();
        const p = prev as { views: number; phones: number; last_synced_at: string } | null;

        await s.from("olx_adverts").upsert({
          olx_id: olxId,
          title: (pick(a, "title") as string) ?? null,
          status: (pick(a, "status") as string) ?? null,
          url: (pick(a, "url") as string) ?? null,
          valid_to: (pick(a, "valid_to") ?? pick(a, "expires_at") ?? pick(a, "date_end") ?? null) as string | null,
          olx_created_at: (pick(a, "created_at") ?? null) as string | null,
          views,
          phones,
          prev_views: p?.views ?? null,
          prev_phones: p?.phones ?? null,
          prev_synced_at: p?.last_synced_at ?? null,
          last_synced_at: new Date().toISOString(),
          raw: a,
        });
        synced++;
      }

      if (adverts.length < 100) break;
      offset += adverts.length;
    }
    return { ok: true, synced };
  } catch (e) {
    return { ok: false, synced, error: e instanceof Error ? e.message : "Błąd synchronizacji ogłoszeń." };
  }
}
