// §13 Kalkulacja ceny zamówienia rezerwacji (brutto, §22).
// Cena końcowa = pakiet + dodatki + transport − rabat. Rabat obejmuje CAŁĄ wartość
// (pakiet + dodatki + transport). Zadatek domyślnie 300 zł + cena transportu (§13.6).

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
  base: number;           // pakiet + dodatki + transport (przed rabatem)
  discountAmount: number; // faktyczna kwota rabatu
  total: number;          // base − rabat (nie mniej niż 0)
}

// §13.4/§13.5 Cena końcowa z rabatem obejmującym całe zamówienie.
export function computeOrderPrice(i: OrderPriceInput): OrderPrice {
  const base = round2((i.packagePrice || 0) + (i.addonsTotal || 0) + (i.transportPrice || 0));
  let discountAmount = 0;
  if (i.discountType === "PERCENT") {
    discountAmount = round2((base * clamp(i.discountValue || 0, 0, 100)) / 100);
  } else {
    discountAmount = round2(Math.max(0, i.discountValue || 0));
  }
  discountAmount = Math.min(discountAmount, base); // rabat nie może przekroczyć wartości zamówienia
  return { base, discountAmount, total: round2(base - discountAmount) };
}

export const DEFAULT_DEPOSIT_BASE = 300; // §13.6 domyślny zadatek bazowy (zł)

// §13.6 Sugerowany zadatek = baza (300 zł) + cena transportu dla klienta.
export function suggestedDeposit(transportPrice: number, base: number = DEFAULT_DEPOSIT_BASE): number {
  return round2(base + Math.max(0, transportPrice || 0));
}
