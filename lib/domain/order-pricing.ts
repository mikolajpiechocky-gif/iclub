// §13 Kalkulacja ceny zamówienia rezerwacji (brutto, §22).
// Cena końcowa = pakiet + dodatki + transport − rabat. RABAT LICZY SIĘ TYLKO OD PAKIETU + DODATKÓW,
// nigdy od transportu (transport to koszt dojazdu, nie podlega negocjacji). Zadatek osobno (§13.6).

export type DiscountType = "AMOUNT" | "PERCENT";

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export interface OrderPriceInput {
  packagePrice: number;   // cena pakietu (brutto, własna — nie suma pozycji)
  addonsTotal: number;    // suma dodatków
  transportPrice: number; // cena transportu dla klienta (0 gdy brak)
  discountType: DiscountType;
  discountValue: number;  // wartość wprowadzona: % (dla PERCENT) lub zł (dla AMOUNT)
}

export interface OrderPrice {
  base: number;             // pakiet + dodatki + transport (przed rabatem)
  discountBase: number;     // podstawa rabatu = pakiet + dodatki (BEZ transportu)
  discountAmount: number;   // faktyczna kwota rabatu
  total: number;            // base − rabat (nie mniej niż 0)
}

// §13.4/§13.5 Cena końcowa. Rabat (% lub kwotowy) liczony WYŁĄCZNIE od pakietu + dodatków —
// transport nigdy nie jest rabatowany. Rabat nie może przekroczyć wartości pakietu + dodatków.
export function computeOrderPrice(i: OrderPriceInput): OrderPrice {
  const discountBase = round2((i.packagePrice || 0) + (i.addonsTotal || 0)); // pakiet + dodatki
  const transport = round2(i.transportPrice || 0);
  const base = round2(discountBase + transport);
  let discountAmount = 0;
  if (i.discountType === "PERCENT") {
    discountAmount = round2((discountBase * clamp(i.discountValue || 0, 0, 100)) / 100);
  } else {
    discountAmount = round2(Math.max(0, i.discountValue || 0));
  }
  discountAmount = Math.min(discountAmount, discountBase); // rabat max = pakiet + dodatki (nie tyka transportu)
  return { base, discountBase, discountAmount, total: round2(base - discountAmount) };
}

export const DEFAULT_DEPOSIT_BASE = 300; // §13.6 domyślny zadatek bazowy (zł)
export const ADDON_DEPOSIT_PCT = 0.15;   // §13.6 zaliczka za dodatki = 15% sumy dodatków

// §13.6 Sugerowany zadatek = baza (300 zł) + transport + 15% sumy dodatków.
// Namiot gastronomiczny, krzesła, stoły itp. — każdy dodatek dokłada 15% swojej wartości do zaliczki.
export function suggestedDeposit(
  transportPrice: number,
  addonsTotal: number = 0,
  base: number = DEFAULT_DEPOSIT_BASE,
): number {
  return round2(base + Math.max(0, transportPrice || 0) + ADDON_DEPOSIT_PCT * Math.max(0, addonsTotal || 0));
}
