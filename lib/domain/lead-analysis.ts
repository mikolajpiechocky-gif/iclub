// §6 Analiza rozmowy leada: czy padły dane wskazujące na domknięcie (dane do umowy).
// Heurystyka (podpowiedź, nie pewnik): e-mail / telefon / NIP albo słowa domknięcia.

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// 9 cyfr (PL), z opcjonalnym +48 i separatorami, z granicami cyfr żeby nie łapać dłuższych liczb.
const PHONE_RE = /(?<!\d)(?:\+?48[\s-]?)?(?:\d[\s-]?){8}\d(?!\d)/;
const NIP_RE = /\bnip\b[:\s]*\d[\d\s-]{8,}\d/i;

// Słowa sygnalizujące domknięcie / przekazanie danych do umowy.
export const CLOSING_KEYWORDS = ["umow", "rezerwuj", "zamawiam", "bior", "potwierdzam", "adres", "nip", "faktur", "zaliczk", "zadatek", "wpłac", "wplac", "przelew", "dane do"];

export interface ContractAnalysis {
  signal: boolean;
  found: string[]; // czytelne etykiety wykrytych sygnałów
}

export function analyzeContractSignals(text: string): ContractAnalysis {
  const src = text || "";
  const t = src.toLowerCase();
  const found: string[] = [];
  if (EMAIL_RE.test(src)) found.push("e-mail");
  if (PHONE_RE.test(src)) found.push("telefon");
  if (NIP_RE.test(src)) found.push("NIP");
  const keywordsHit = CLOSING_KEYWORDS.filter((kw) => t.includes(kw));
  if (keywordsHit.length) found.push("słowa domknięcia");
  const hardData = found.some((f) => f === "e-mail" || f === "telefon" || f === "NIP");
  return { signal: hardData || keywordsHit.length > 0, found: [...new Set(found)] };
}

export function extractEmail(text: string): string | null {
  const m = EMAIL_RE.exec(text || "");
  return m ? m[0] : null;
}
