// Ogłoszenia OLX: odczyt (owner, RLS) + synchronizacja (service_role).
// Zbiera wyświetlenia i odsłony numeru; trzyma poprzednie wartości do policzenia
// przyrostu od ostatniej synchronizacji. Mapowanie defensywne (potwierdzimy na danych).
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getValidAccessToken } from "./olx";
import { getAdverts, getAdvert, getAdvertStatistics } from "@/lib/integrations/olx";
import { extractLocation, extractLatLng, extractCityId } from "@/lib/integrations/olx/extract";
import { reverseGeocodeCity } from "@/lib/integrations/google-maps";

// §OLX Głębokie (BFS) wyszukanie pierwszej liczbowej wartości pod pasującym kluczem — statystyki
// OLX bywają zagnieżdżone/inaczej nazwane (telefony działają, a „views" bywa np. impressions/page_views).
function deepNum(root: unknown, keys: string[]): number {
  const set = new Set(keys.map((k) => k.toLowerCase()));
  const queue: unknown[] = [root];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    if (Array.isArray(node)) { for (const it of node) queue.push(it); continue; }
    const rec = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(rec)) {
      if (set.has(k.toLowerCase())) { const n = Number(v); if (Number.isFinite(n)) return n; }
    }
    for (const v of Object.values(rec)) queue.push(v);
  }
  return 0;
}

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
  const cityByCityId = new Map<number, string>(); // §OLX cache miast (city_id → nazwa) — jedno geokodowanie na miasto
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
          // BFS po wszystkich wariantach nazw — dawniej sztywne „views" dawało 0 mimo realnych odsłon.
          views = deepNum(st, ["views", "impressions", "page_views", "pageviews", "detail_views", "detailviews", "visits", "views_count", "view_count", "displays"]);
          phones = deepNum(st, ["phones", "phone_views", "phoneviews", "phone", "calls", "phone_clicks", "phone_reveals", "reveal_phone", "phone_count", "contacts"]);
          statsOk = true;
        } catch {
          /* chwilowy błąd statystyk — NIE nadpisujemy realnych wartości zerami */
        }

        // §OLX Miasto: najpierw z listy; gdy brak (lista bywa uboga) — z detalu ogłoszenia.
        let city = extractLocation(a);
        let latlng = extractLatLng(a);
        let cityId = extractCityId(a);
        if (!city || !latlng) {
          try {
            const detail = (await getAdvert(token, olxId)) as Record<string, unknown>;
            const d = pick(detail, "data") ?? detail;
            city = city ?? extractLocation(d);
            latlng = latlng ?? extractLatLng(d);
            cityId = cityId ?? extractCityId(d);
          } catch { /* brak detalu — zostaje puste */ }
        }
        // §OLX OLX nie podaje NAZWY miasta (tylko city_id + lat/lng) — wyłuskujemy nazwę z Google
        // (reverse geocoding), z cache po city_id, żeby nie geokodować tego samego miasta wielokrotnie.
        if (!city && latlng) {
          if (cityId != null && cityByCityId.has(cityId)) city = cityByCityId.get(cityId)!;
          else {
            const geoCity = await reverseGeocodeCity(latlng.lat, latlng.lng);
            if (geoCity) { city = geoCity; if (cityId != null) cityByCityId.set(cityId, geoCity); }
          }
        }

        const { data: prev } = await s.from("olx_adverts").select("views, phones, last_synced_at").eq("olx_id", olxId).maybeSingle();
        const p = prev as { views: number; phones: number; last_synced_at: string } | null;

        const row: Record<string, unknown> = {
          olx_id: olxId,
          title: (pick(a, "title") as string) ?? null,
          city, // §B3 miasto ogłoszenia (z listy lub detalu) — rozróżnianie ofert po lokalizacji
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
