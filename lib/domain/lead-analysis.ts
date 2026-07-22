// §6 Analiza rozmowy leada OLX. Zamiast łapać sam e-mail/telefon (który pada niemal
// w każdym zapytaniu), oceniamy CAŁĄ rozmowę i szacujemy, czy rezerwacja faktycznie
// została domknięta. Heurystyka świadoma kierunku (kto pisał: my czy klient).

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// 9 cyfr (PL), z opcjonalnym +48 i separatorami, z granicami cyfr żeby nie łapać dłuższych liczb.
const PHONE_RE = /(?<!\d)(?:\+?48[\s-]?)?(?:\d[\s-]?){8}\d(?!\d)/;
const NIP_RE = /\bnip\b[:\s]*\d[\d\s-]{8,}\d/i;
const POSTAL_RE = /\b\d{2}-\d{3}\b/; // kod pocztowy → adres do dostawy
const STREET_RE = /\b(?:ul\.|ulica|al\.|aleja|os\.|osiedle)\s*[a-ząćęłńóśźż0-9]/i;
const DATE_RE = /\b(\d{1,2})[.\-/](\d{1,2})(?:[.\-/]\d{2,4})?\b/; // 12.08 / 12-08-2026

export type LeadStage = "CLOSED" | "LIKELY" | "NEGOTIATING" | "NEW" | "COLD";

export const LEAD_STAGE_META: Record<LeadStage, { label: string; fg: string; bg: string }> = {
  CLOSED: { label: "Domknięte", fg: "#5fd68b", bg: "#16301f" },
  LIKELY: { label: "Blisko finalizacji", fg: "#7bd88f", bg: "#1a2b1e" },
  NEGOTIATING: { label: "W rozmowie", fg: "#ebb05a", bg: "#332814" },
  NEW: { label: "Świeże", fg: "#7fa8f5", bg: "#182238" },
  COLD: { label: "Wystygło", fg: "#9aa0b2", bg: "#22242e" },
};

export interface ConvMessage {
  text: string;
  mine: boolean;
}

export interface ConversationAnalysis {
  stage: LeadStage;
  score: number; // 0–100 — pewność domknięcia
  signal: boolean; // true = wygląda na domkniętą ofertę (dane do umowy)
  reasons: string[]; // czytelne etykiety, co za tym przemawia
}

// Waga sygnału i etykieta. „mine" = wypowiedź nasza (potwierdzenie z naszej strony),
// „theirs" = wypowiedź klienta (deklaracja klienta).
interface Rule {
  label: string;
  weight: number;
  side: "mine" | "theirs" | "any";
  test: (t: string) => boolean;
}

const has = (t: string, ...frags: string[]) => frags.some((f) => t.includes(f));

const RULES: Rule[] = [
  // Płatność — najmocniejszy dowód domknięcia (zaliczka/zadatek/przelew/konto).
  { label: "wpłata / zaliczka", weight: 42, side: "any", test: (t) => has(t, "zaliczk", "zadatek", "wpłac", "wplac", "przelew", "blik", "opłac", "oplac", "zapłac", "zaplac", "numer konta", "nr konta", "dane do przelewu", "zaksięgow", "zaksiegow") },
  // Klient jednoznacznie rezerwuje / bierze.
  { label: "klient potwierdza rezerwację", weight: 34, side: "theirs", test: (t) => has(t, "rezerwuj", "biorę", "biore", "bierzemy", "zamawiam", "zamawiamy", "potwierdzam", "decyduj", "wchodzę", "wchodze", "umawiam", "chcę zarezerwow", "chce zarezerwow", "tak, pobier", "tak pobier") },
  // Potwierdzenie z naszej strony (termin zaklepany, umowa wysłana).
  { label: "potwierdzenie z naszej strony", weight: 24, side: "mine", test: (t) => has(t, "zarezerwowa", "trzymam termin", "rezerwuję termin", "rezerwuje termin", "potwierdzam rezerwacj", "umowa w załącz", "umowa w zalacz", "wysłałem umow", "wyslalem umow", "wysyłam umow", "wysylam umow", "do zobaczenia", "widzimy się", "widzimy sie", "dziękuję za wpłat", "dziekuje za wplat") },
  // Umowa / dane do umowy / faktury.
  { label: "dane do umowy / faktury", weight: 30, side: "any", test: (t) => has(t, "dane do umow", "dane do faktur", "na umow", "umowa", "umowe", "umowę", "wystawić faktur", "wystawic faktur") },
  { label: "NIP / faktura firmowa", weight: 24, side: "any", test: (t) => NIP_RE.test(t) },
  // Adres do dostawy/montażu (ulica lub kod pocztowy).
  { label: "adres do dostawy", weight: 24, side: "theirs", test: (t) => STREET_RE.test(t) || POSTAL_RE.test(t) },
  // Ustalony konkretny termin.
  { label: "ustalony termin", weight: 14, side: "any", test: (t) => DATE_RE.test(t) },
  // Klient zostawił kontakt (słabszy sygnał — pada często).
  { label: "kontakt klienta", weight: 10, side: "theirs", test: (t) => EMAIL_RE.test(t) || PHONE_RE.test(t) },
];

// Sygnały rezygnacji — obniżają wynik i przesuwają do „wystygło".
const REJECT_RE = /(rezygnuj|nie skorzystam|nie jestem zainteresowan|znalazłem gdzie indziej|znalazlem gdzie indziej|już nie potrzeb|juz nie potrzeb|już nie jestem|juz nie jestem|za drogo|innym razem|może następnym|moze nastepnym|nieaktualne|dziękuję, nie|dziekuje, nie)/i;

export function analyzeConversation(messages: ConvMessage[], fallbackText?: string): ConversationAnalysis {
  const msgs = messages && messages.length ? messages : fallbackText ? [{ text: fallbackText, mine: false }] : [];
  const mineText = msgs.filter((m) => m.mine).map((m) => m.text).join("\n").toLowerCase();
  const theirText = msgs.filter((m) => !m.mine).map((m) => m.text).join("\n").toLowerCase();
  const allText = msgs.map((m) => m.text).join("\n").toLowerCase();

  const reasons: string[] = [];
  let score = 0;
  for (const r of RULES) {
    const scope = r.side === "mine" ? mineText : r.side === "theirs" ? theirText : allText;
    if (scope && r.test(scope)) {
      score += r.weight;
      reasons.push(r.label);
    }
  }

  // Rezygnacja klienta zbija wynik (chyba że wcześniej realnie wpłacił).
  const rejected = theirText ? REJECT_RE.test(theirText) : false;
  const paid = reasons.includes("wpłata / zaliczka");
  if (rejected && !paid) {
    score = Math.max(0, score - 55);
    reasons.push("sygnał rezygnacji");
  }

  score = Math.min(100, score);

  let stage: LeadStage;
  if (rejected && !paid) stage = "COLD";
  else if (score >= 58) stage = "CLOSED";
  else if (score >= 34) stage = "LIKELY";
  else if (score >= 12) stage = "NEGOTIATING";
  else stage = "NEW";

  return { stage, score, signal: stage === "CLOSED", reasons: [...new Set(reasons)] };
}

export function extractEmail(text: string): string | null {
  const m = EMAIL_RE.exec(text || "");
  return m ? m[0] : null;
}

export function extractPhone(text: string): string | null {
  const m = PHONE_RE.exec(text || "");
  return m ? m[0].replace(/[\s-]/g, "") : null;
}
