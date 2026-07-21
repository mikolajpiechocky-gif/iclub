// §20 Okres widoku kosztów i płatności: miesiąc (domyślnie bieżący), rok albo całość.
// Bezpieczne dla stref czasowych — porównania po prefiksie ISO (YYYY-MM-DD…).

export type Period =
  | { kind: "month"; year: number; month: number } // month: 1–12
  | { kind: "year"; year: number }
  | { kind: "all" };

const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const pad2 = (n: number) => String(n).padStart(2, "0");

// Parsuje ?period=. Domyślnie bieżący miesiąc. Akceptuje "YYYY-MM", "YYYY", "all".
export function parsePeriod(param: string | undefined, now: Date): Period {
  if (param === "all") return { kind: "all" };
  if (param && /^\d{4}$/.test(param)) return { kind: "year", year: Number(param) };
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    if (m >= 1 && m <= 12) return { kind: "month", year: y, month: m };
  }
  return { kind: "month", year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function periodParam(p: Period): string {
  if (p.kind === "all") return "all";
  if (p.kind === "year") return String(p.year);
  return `${p.year}-${pad2(p.month)}`;
}

export function periodLabel(p: Period): string {
  if (p.kind === "all") return "Wszystko";
  if (p.kind === "year") return `Rok ${p.year}`;
  return `${MONTHS[p.month - 1]} ${p.year}`;
}

// Prefiks ISO danego okresu ("2026-07", "2026" albo "" dla całości).
function periodPrefix(p: Period): string {
  if (p.kind === "all") return "";
  if (p.kind === "year") return String(p.year);
  return `${p.year}-${pad2(p.month)}`;
}

// Czy data (YYYY-MM-DD lub pełny ISO) mieści się w okresie. null → tylko dla „Wszystko".
export function periodContains(p: Period, iso: string | null): boolean {
  if (p.kind === "all") return true;
  if (!iso) return false;
  return iso.startsWith(periodPrefix(p));
}

// Sąsiedni miesiąc (do nawigacji ‹ ›). Dla roku/„Wszystko" cofa do bieżącego miesiąca odniesienia.
export function shiftMonth(p: Period, delta: number, now: Date): Period {
  const baseY = p.kind === "month" ? p.year : now.getFullYear();
  const baseM = p.kind === "month" ? p.month : now.getMonth() + 1;
  const idx = baseY * 12 + (baseM - 1) + delta;
  return { kind: "month", year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}
