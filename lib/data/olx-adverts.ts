// Ogłoszenia OLX: odczyt (owner, RLS) + synchronizacja (service_role).
// Zbiera wyświetlenia i odsłony numeru; trzyma poprzednie wartości do policzenia
// przyrostu od ostatniej synchronizacji. Mapowanie defensywne (potwierdzimy na danych).
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getValidAccessToken } from "./olx";
import { getAdverts, getAdvertStatistics } from "@/lib/integrations/olx";
import { extractLocation } from "@/lib/integrations/olx/extract";

export interface OlxAdvert {
  olx_id: string;
  title: string | null;
  city: string | null;
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

// §B3 Sezonowość rok-do-roku: z dziennych snapshotów (kumulatywne wartości OLX) liczymy
// PRZYROST dzień-do-dnia per ogłoszenie i sumujemy po miesiącach każdego roku. Ujemne skoki
// (ogłoszenie wystawione od nowa → licznik od zera) obcinamy do 0.
export interface OlxSeasonalityYear { year: number; views: number[]; phones: number[] } // po 12 wartości (Sty…Gru)

export async function getOlxSeasonality(): Promise<{ series: OlxSeasonalityYear[]; hasData: boolean }> {
  if (!isSupabaseConfigured()) return { series: [], hasData: false };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("olx_advert_stats")
    .select("olx_id, captured_on, views, phones")
    .order("olx_id", { ascending: true })
    .order("captured_on", { ascending: true });
  if (error || !data) return { series: [], hasData: false };

  const buckets = new Map<number, { views: number[]; phones: number[] }>();
  const ensure = (y: number) => {
    let b = buckets.get(y);
    if (!b) { b = { views: Array(12).fill(0), phones: Array(12).fill(0) }; buckets.set(y, b); }
    return b;
  };
  let prev: { olx_id: string; views: number; phones: number } | null = null;
  for (const row of data as { olx_id: string; captured_on: string; views: number; phones: number }[]) {
    const cur = { olx_id: row.olx_id, views: Number(row.views || 0), phones: Number(row.phones || 0) };
    if (prev && prev.olx_id === cur.olx_id) {
      const d = new Date(row.captured_on);
      const b = ensure(d.getUTCFullYear());
      b.views[d.getUTCMonth()] += Math.max(0, cur.views - prev.views);
      b.phones[d.getUTCMonth()] += Math.max(0, cur.phones - prev.phones);
    }
    prev = cur;
  }
  const series = [...buckets.keys()].sort().map((year) => ({ year, views: buckets.get(year)!.views, phones: buckets.get(year)!.phones }));
  const hasData = series.some((s) => s.views.some((v) => v > 0) || s.phones.some((p) => p > 0));
  return { series, hasData };
}

// §OLX Ręczne usunięcie WSZYSTKICH zaimportowanych ogłoszeń (bez rozłączania konta) —
// naprawa po błędnym spięciu, gdy właściwe konto jest już podpięte. Kolejna synchronizacja
// pobierze ogłoszenia z aktualnego konta na czysto.
export async function clearAllOlxAdverts(): Promise<number> {
  const s = createAdminClient();
  const { data } = await s.from("olx_adverts").delete().not("olx_id", "is", null).select("olx_id");
  await s.from("olx_advert_stats").delete().not("olx_id", "is", null).then(() => {}, () => {});
  return data?.length ?? 0;
}

export async function syncOlxAdverts(): Promise<OlxAdvertsSyncResult> {
  const token = await getValidAccessToken();
  if (!token) return { ok: false, synced: 0, error: "OLX niepołączone — najpierw „Połącz OLX” w Ustawieniach." };

  const s = createAdminClient();
  let synced = 0;
  let offset = 0;
  const seenIds: string[] = []; // §OLX id-ki ogłoszeń realnie obecnych na koncie (do sprzątania nieaktualnych)
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
        let statsOk = false;
        try {
          const st = (await getAdvertStatistics(token, olxId)) as Record<string, unknown>;
          views = num(pick(st, "data", "views") ?? pick(st, "views") ?? pick(st, "data", "impressions"));
          phones = num(pick(st, "data", "phones") ?? pick(st, "phones") ?? pick(st, "data", "phone_views") ?? pick(st, "phone_views"));
          statsOk = true;
        } catch {
          /* chwilowy błąd statystyk — NIE nadpisujemy realnych wartości zerami */
        }

        const { data: prev } = await s.from("olx_adverts").select("views, phones, last_synced_at").eq("olx_id", olxId).maybeSingle();
        const p = prev as { views: number; phones: number; last_synced_at: string } | null;

        const row: Record<string, unknown> = {
          olx_id: olxId,
          title: (pick(a, "title") as string) ?? null,
          city: extractLocation(a), // §B3 miasto ogłoszenia — rozróżnianie ofert po lokalizacji
          status: (pick(a, "status") as string) ?? null,
          url: (pick(a, "url") as string) ?? null,
          valid_to: (pick(a, "valid_to") ?? pick(a, "expires_at") ?? pick(a, "date_end") ?? null) as string | null,
          olx_created_at: (pick(a, "created_at") ?? null) as string | null,
          last_synced_at: new Date().toISOString(),
          raw: a,
        };
        // §OLX Wyświetlenia/telefony i historię prev_* aktualizujemy TYLKO przy udanym pomiarze —
        // chwilowy błąd API nie skasuje realnych metryk (i nie zafałszuje rankingu skokiem ±).
        if (statsOk) {
          row.views = views;
          row.phones = phones;
          row.prev_views = p?.views ?? null;
          row.prev_phones = p?.phones ?? null;
          row.prev_synced_at = p?.last_synced_at ?? null;
        }
        await s.from("olx_adverts").upsert(row);
        seenIds.push(olxId);
        // §B3 Dzienny snapshot statystyk (do wykresu sezonowości rok-do-roku). Jeden wpis na dzień
        // (upsert po olx_id+captured_on) — kilka synchronizacji dziennie nadpisuje najnowszą wartością.
        if (statsOk) {
          const today = new Date().toISOString().slice(0, 10);
          await s.from("olx_advert_stats").upsert({ olx_id: olxId, captured_on: today, views, phones }, { onConflict: "olx_id,captured_on" }).then(() => {}, () => {});
        }
        synced++;
      }

      if (adverts.length < 100) break;
      offset += adverts.length;
    }
    // §OLX Usuń ogłoszenia, których NIE ma już na koncie (np. z wcześniej błędnie podpiętego konta) —
    // inaczej zostawałyby na zawsze. Tylko gdy sync coś pobrał (pusta odpowiedź nie kasuje wszystkiego).
    if (seenIds.length > 0) {
      const { data: existing } = await s.from("olx_adverts").select("olx_id");
      const stale = ((existing ?? []) as { olx_id: string }[]).map((r) => r.olx_id).filter((id) => !seenIds.includes(id));
      if (stale.length) {
        await s.from("olx_adverts").delete().in("olx_id", stale);
        await s.from("olx_advert_stats").delete().in("olx_id", stale).then(() => {}, () => {});
      }
    }
    return { ok: true, synced };
  } catch (e) {
    return { ok: false, synced, error: e instanceof Error ? e.message : "Błąd synchronizacji ogłoszeń." };
  }
}
