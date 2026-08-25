// §II.2 Rozbicie rozliczenia realizacji do wyświetlenia na miejscu:
// Pakiet / Dodatki / Transport / Suma / Zadatek / Do zapłaty na miejscu.
// Dodatki liczone z AKTUALNEJ listy rezerwacji (uwzględnia dosprzedaż z telefonu §II.12).
// Zadatek: z rezerwacji, a gdy nie ustawiono — domyślnie 300 zł + transport (§13.6).
import type { ReservationRecord } from "@/lib/data/types";
import { suggestedDeposit } from "./order-pricing";

const round2 = (n: number) => Math.round(n * 100) / 100;
const numOr = (v: unknown, d = 0): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : d;
};

export interface SettlementLine { name: string; price: number }
export interface SettlementBreakdown {
  packageName: string | null;
  packagePrice: number;
  addons: SettlementLine[];
  addonsTotal: number;
  transport: number;
  discount: number;
  total: number;
  deposit: number;           // efektywny zadatek (z rezerwacji lub sugerowany)
  depositSuggested: boolean; // true → użyto domyślnego 300 zł + transport
  toPayOnSite: number;       // suma − zadatek (nie mniej niż 0)
}

// Katalog dodatków: id → { nazwa, cena za sztukę }. Zwykle z listReservationAddons().
export type AddonPriceMap = Map<string, { name: string; price: number }>;
// Skład wybranego pakietu: equipmentId → ilość wliczona w pakiet (płatna tylko nadwyżka).
export type PackageIncluded = Record<string, number>;

export function settlementBreakdown(
  r: Pick<ReservationRecord, "addon_ids" | "addon_qty" | "transport_price" | "discount" | "deposit" | "price" | "pricing_snapshot"> & { package?: { name?: string | null } | null },
  addonPrice: AddonPriceMap,
  included: PackageIncluded = {},
): SettlementBreakdown {
  const snap = r.pricing_snapshot;
  const transport = round2(numOr(r.transport_price ?? snap?.transport_price));
  const discount = round2(numOr(r.discount ?? snap?.discount_amount));

  const ids = r.addon_ids ?? [];
  const qty = r.addon_qty ?? {};
  // §K1 Płatna tylko NADWYŻKA ponad ilość wliczoną w pakiet (jak billableOf w formularzu) —
  // inaczej dodatek będący częścią pakietu byłby liczony podwójnie.
  const addons: SettlementLine[] = ids.map((id) => {
    const a = addonPrice.get(id);
    const n = Math.max(1, Math.round(numOr(qty[id], 1)));
    const inc = Math.max(0, Math.round(numOr(included[id])));
    const billable = Math.max(0, n - inc);
    return { name: a?.name ?? "Dodatek", price: round2(numOr(a?.price) * billable) };
  });
  const addonsTotal = round2(addons.reduce((s, a) => s + a.price, 0));

  const packageName = snap?.package?.name ?? r.package?.name ?? null;
  // Cena pakietu: ze snapshotu (najpewniejsze) lub wsteczne wyliczenie z ceny końcowej.
  const packagePrice = snap?.package
    ? round2(numOr(snap.package.price))
    : Math.max(0, round2(numOr(r.price) - transport - addonsTotal + discount));

  const computedTotal = round2(packagePrice + addonsTotal + transport - discount);
  // §K3 Szanuj ustaloną cenę końcową (r.price — może być ręcznie zaokrąglona); doliczaj tylko
  // dosprzedaż dodatków dopiętą PO zapisie (różnica wartości dodatków względem snapshotu).
  let total: number;
  if (numOr(r.price) > 0) {
    const snapAddons = round2((snap?.addons ?? []).reduce((s, a) => s + numOr(a.price), 0));
    const dosprzedaz = Math.max(0, round2(addonsTotal - snapAddons));
    total = round2(numOr(r.price) + dosprzedaz);
  } else {
    total = computedTotal;
  }

  // §S1 Zadatek: 0 zł to prawidłowa wartość (nie „brak"). Sugestię 300+transport stosujemy
  // tylko gdy zadatku faktycznie nie podano (legacy null).
  const depositRaw = numOr(r.deposit, NaN);
  const hasDeposit = Number.isFinite(depositRaw);
  const depositSuggested = !hasDeposit;
  const deposit = hasDeposit ? round2(depositRaw) : suggestedDeposit(transport, addonsTotal);
  const toPayOnSite = Math.max(0, round2(total - deposit));

  return { packageName, packagePrice, addons, addonsTotal, transport, discount, total, deposit, depositSuggested, toPayOnSite };
}
