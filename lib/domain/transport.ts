// Reguły domenowe: koszt paliwa (§34).
// Wzór: koszt = (kilometry / 100) × spalanie × cena paliwa.
// Cena paliwa jest konfigurowalna (§51) — tu wartość domyślna.

export const DEFAULT_FUEL_PRICE = 6.5; // zł/l (do zmiany w ustawieniach)

export function fuelCost(km: number, consumption: number, price: number): number {
  if (!km || !consumption || !price) return 0;
  return Math.round((km / 100) * consumption * price * 100) / 100;
}
