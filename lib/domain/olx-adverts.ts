// Reguły domenowe analizy ogłoszeń OLX: wygaśnięcia, skuteczność (telefony/wyświetlenia),
// przyrost od ostatniej synchronizacji, zalecenia. Progi są heurystyczne (do kalibracji).
import type { OlxAdvert } from "@/lib/data/olx-adverts";

export interface AdvertInsight {
  advert: OlxAdvert;
  daysToExpiry: number | null;
  expired: boolean;
  expiringSoon: boolean; // ≤ 3 dni
  conversion: number | null; // telefony / wyświetlenia
  deltaViews: number | null;
  deltaPhones: number | null;
  recommendations: string[];
  priority: number; // do sortowania „do reakcji"
  score: number; // 0–100 — ranking skuteczności (leady > wyświetlenia)
  rank: number; // pozycja w rankingu (1 = najlepsze)
}

export interface FleetSummary {
  count: number;
  totalViews: number;
  totalPhones: number;
  avgViews: number;
  avgConversion: number; // średnia ważona (suma telefonów / suma wyświetleń)
  toReact: number; // wygasłe + wygasające
}

const DAY = 86_400_000;
const EXPIRING_DAYS = 3;
const LOW_CONVERSION = 0.02; // < 2% telefonów na wyświetlenie
const GOOD_CONVERSION = 0.05; // ≥ 5%
const MIN_VIEWS_FOR_CONV = 30; // poniżej tylu wyświetleń nie oceniamy skuteczności

export function summarize(adverts: OlxAdvert[]): FleetSummary {
  const totalViews = adverts.reduce((s, a) => s + (a.views || 0), 0);
  const totalPhones = adverts.reduce((s, a) => s + (a.phones || 0), 0);
  return {
    count: adverts.length,
    totalViews,
    totalPhones,
    avgViews: adverts.length ? Math.round(totalViews / adverts.length) : 0,
    avgConversion: totalViews > 0 ? totalPhones / totalViews : 0,
    toReact: 0, // uzupełniane po analizie
  };
}

export function analyzeAdvert(a: OlxAdvert, fleet: FleetSummary, now = Date.now()): AdvertInsight {
  const validMs = a.valid_to ? new Date(a.valid_to).getTime() : NaN;
  const daysToExpiry = Number.isNaN(validMs) ? null : Math.floor((validMs - now) / DAY);
  const expired = daysToExpiry != null && daysToExpiry < 0;
  const expiringSoon = daysToExpiry != null && daysToExpiry >= 0 && daysToExpiry <= EXPIRING_DAYS;
  const conversion = a.views > 0 ? a.phones / a.views : null;
  const deltaViews = a.prev_views != null ? a.views - a.prev_views : null;
  const deltaPhones = a.prev_phones != null ? a.phones - a.prev_phones : null;

  const rec: string[] = [];
  let priority = 0;

  if (expired) {
    rec.push("Wygasło — wystaw ponownie albo odśwież, żeby wróciło do wyników.");
    priority = Math.max(priority, 100);
  } else if (expiringSoon) {
    rec.push(`Wygasa za ${daysToExpiry} ${daysToExpiry === 1 ? "dzień" : "dni"} — przedłuż lub odśwież.`);
    priority = Math.max(priority, 80);
  }

  // Skuteczność (telefony) tylko przy sensownej liczbie wyświetleń.
  if (a.views >= MIN_VIEWS_FOR_CONV && conversion != null) {
    if (conversion < LOW_CONVERSION) {
      rec.push("Dużo wyświetleń, mało telefonów — popraw cenę, pierwsze zdjęcie i pierwsze zdanie opisu.");
      priority = Math.max(priority, 50);
    } else if (conversion >= GOOD_CONVERSION) {
      rec.push("Dobra skuteczność — utrzymaj, rozważ delikatną podwyżkę ceny.");
    }
  }

  // Wyświetlenia znacznie poniżej średniej floty → słaba widoczność.
  if (fleet.avgViews > 0 && a.views < 0.5 * fleet.avgViews) {
    rec.push("Mało wyświetleń względem reszty ogłoszeń — odśwież, popraw tytuł i miniaturę, rozważ promowanie.");
    priority = Math.max(priority, 40);
  }

  // Zastój od ostatniej synchronizacji.
  if (deltaViews != null && deltaViews === 0 && a.prev_synced_at) {
    rec.push("Brak nowych wyświetleń od ostatniej synchronizacji — odśwież.");
    priority = Math.max(priority, 30);
  }

  if (!rec.length) rec.push("OK — bez działań.");

  // score/rank uzupełniane w analyzeFleet (potrzebują całej floty do normalizacji).
  return { advert: a, daysToExpiry, expired, expiringSoon, conversion, deltaViews, deltaPhones, recommendations: rec, priority, score: 0, rank: 0 };
}

// Ranking skuteczności: leady (odsłony numeru) ważą najwięcej, potem skuteczność, potem
// zasięg (wyświetlenia). Normalizacja do najlepszego w danej flocie → 0–100.
function scoreAdvert(i: AdvertInsight, max: { phones: number; views: number; conv: number }): number {
  const phonesN = max.phones > 0 ? i.advert.phones / max.phones : 0;
  const viewsN = max.views > 0 ? i.advert.views / max.views : 0;
  const convN = max.conv > 0 && i.advert.views >= MIN_VIEWS_FOR_CONV && i.conversion != null ? i.conversion / max.conv : 0;
  const raw = 0.55 * phonesN + 0.3 * convN + 0.15 * viewsN;
  return Math.round(raw * 100);
}

export function analyzeFleet(adverts: OlxAdvert[], now = Date.now()): { insights: AdvertInsight[]; summary: FleetSummary } {
  const summary = summarize(adverts);
  const insights = adverts.map((a) => analyzeAdvert(a, summary, now));

  // Ranking: normalizacja do najlepszego w flocie, potem sort malejąco po score.
  const max = {
    phones: Math.max(0, ...insights.map((i) => i.advert.phones)),
    views: Math.max(0, ...insights.map((i) => i.advert.views)),
    conv: Math.max(0, ...insights.filter((i) => i.advert.views >= MIN_VIEWS_FOR_CONV).map((i) => i.conversion ?? 0)),
  };
  for (const i of insights) i.score = scoreAdvert(i, max);
  insights.sort((x, y) => y.score - x.score || y.advert.phones - x.advert.phones || y.advert.views - x.advert.views);
  insights.forEach((i, idx) => (i.rank = idx + 1));

  summary.toReact = insights.filter((i) => i.expired || i.expiringSoon).length;
  return { insights, summary };
}
