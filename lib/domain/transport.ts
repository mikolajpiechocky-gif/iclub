// Reguły domenowe: koszt paliwa (§34).
// Wzór: koszt = (kilometry / 100) × spalanie × cena paliwa.
// Cena paliwa jest konfigurowalna (§51) — tu wartość domyślna.

export const DEFAULT_FUEL_PRICE = 6.5; // zł/l (do zmiany w ustawieniach)

export function fuelCost(km: number, consumption: number, price: number): number {
  if (!km || !consumption || !price) return 0;
  return Math.round((km / 100) * consumption * price * 100) / 100;
}

// Amortyzacja auta (bez paliwa): km × stawka (§34, koszt wewnętrzny).
export function amortizationCost(km: number, ratePerKm: number): number {
  if (!km || !ratePerKm) return 0;
  return Math.round(km * ratePerKm * 100) / 100;
}

export interface FuelPrices {
  petrol: number;
  diesel: number;
  lpg: number;
}

// Dobór ceny paliwa wg typu pojazdu (z Ustawień). Domyślnie diesel.
export function fuelPriceForType(fuelType: string | null, prices: FuelPrices): number {
  const t = (fuelType ?? "").toLowerCase();
  if (t.includes("benz")) return prices.petrol;
  if (t.includes("lpg")) return prices.lpg;
  return prices.diesel;
}

// §15 Widełki transportowe — cena dla KLIENTA wg odległości W JEDNĄ STRONĘ (brutto).
export const TRANSPORT_BRACKETS: { maxKm: number; price: number }[] = [
  { maxKm: 20, price: 200 },
  { maxKm: 50, price: 300 },
  { maxKm: 100, price: 350 },
  { maxKm: 150, price: 400 },
  { maxKm: 200, price: 450 },
  { maxKm: 250, price: 500 },
  { maxKm: 300, price: 600 },
  { maxKm: 400, price: 900 },
];
// Cena dla klienta albo null (> 400 km → wycena indywidualna Szefa).
export function clientTransportPrice(oneWayKm: number): number | null {
  for (const b of TRANSPORT_BRACKETS) if (oneWayKm <= b.maxKm) return b.price;
  return null;
}

// §16.3 Klasyfikacja: dokładnie 100 km = bliski; daleki dopiero POWYŻEJ 100 km.
export function tripClass(oneWayKm: number): "near" | "far" {
  return oneWayKm > 100 ? "far" : "near";
}

// §16 Mnożnik przejazdu: pracownik zostaje na miejscu (D×2) albo wraca do bazy (D×4).
export function tripMultiplier(returnsToBase: boolean): 2 | 4 {
  return returnsToBase ? 4 : 2;
}

// Planowane kilometry = odległość w jedną stronę × mnożnik.
export function plannedKm(oneWayKm: number, returnsToBase: boolean): number {
  return Math.round(oneWayKm * tripMultiplier(returnsToBase) * 10) / 10;
}
