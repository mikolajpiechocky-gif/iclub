// Wyszukiwarka globalna: rezerwacje, klienci, magazyn. Dopasowanie ROZMYTE
// (odporne na literówki): normalizacja bez ogonków + odległość Levenshteina na
// słowach. Filtrowanie po stronie serwera w JS — proste, wystarczające dla skali.
import { listReservations } from "./reservations";
import { listCustomers } from "./customers";
import { listEquipment } from "./equipment";
import { listTents } from "./resources";
import type { ReservationWithRefs, CustomerRecord, EquipmentRecord, TentRecord } from "./types";

const LIMIT = 8;

// Małe litery + usunięcie diakrytyków (ł→l ręcznie, reszta przez NFD).
const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let cur = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

// Wynik dopasowania: 0 = brak. Podłańcuch > dopasowanie rozmyte. Wyższy = lepszy.
export function fuzzyScore(text: string, query: string): number {
  const t = norm(text);
  const q = norm(query);
  if (!q || !t) return 0;

  const idx = t.indexOf(q);
  if (idx >= 0) return 1200 - Math.min(idx, 400) + (idx === 0 ? 300 : 0);

  const words = t.split(/[\s,./-]+/).filter(Boolean);
  const tokens = q.split(/\s+/).filter(Boolean);
  let score = 0;
  for (const tok of tokens) {
    const maxAllowed = tok.length <= 3 ? 1 : tok.length <= 6 ? 2 : 3;
    let best = Infinity;
    for (const w of words) {
      const dFull = levenshtein(tok, w);
      const dPrefix = w.length > tok.length ? levenshtein(tok, w.slice(0, tok.length)) : dFull;
      best = Math.min(best, dFull, dPrefix);
      if (best === 0) break;
    }
    if (best > maxAllowed) return 0; // token bez dopasowania → cała fraza odpada
    score += maxAllowed - best + 1;
  }
  return 100 + score;
}

function bestScore(query: string, fields: (string | null | undefined)[]): number {
  let best = 0;
  for (const f of fields) {
    const s = fuzzyScore(f ?? "", query);
    if (s > best) best = s;
  }
  return best;
}

function rank<T>(items: T[], query: string, fields: (item: T) => (string | null | undefined)[]): T[] {
  return items
    .map((item) => ({ item, s: bestScore(query, fields(item)) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, LIMIT)
    .map((x) => x.item);
}

export interface SearchResults {
  reservations: ReservationWithRefs[];
  customers: CustomerRecord[];
  tents: TentRecord[];
  equipment: EquipmentRecord[];
  total: number;
}

const EMPTY: SearchResults = { reservations: [], customers: [], tents: [], equipment: [], total: 0 };

export async function searchEverything(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) return EMPTY;

  const [reservations, customers, tents, equipment] = await Promise.all([
    listReservations(),
    listCustomers(),
    listTents(),
    listEquipment(),
  ]);

  const reservationHits = rank(reservations, q, (r) => [r.customer?.name, r.location, r.event_type, r.notes, r.rental_items]);
  const customerHits = rank(customers, q, (c) => [c.name, c.phone, c.email, c.city, c.tax_id]);
  const tentHits = rank(tents, q, (t) => [t.name, t.size, t.set_color, t.code]);
  const equipmentHits = rank(equipment, q, (e) => [e.name, e.code, e.category]);

  return {
    reservations: reservationHits,
    customers: customerHits,
    tents: tentHits,
    equipment: equipmentHits,
    total: reservationHits.length + customerHits.length + tentHits.length + equipmentHits.length,
  };
}
