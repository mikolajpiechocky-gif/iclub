// §11.1 Skład pakietu jako mapa: { packageId: { equipmentId: iloscWPakiecie } }.
// Dodatek wybrany w rezerwacji, ktory jest w skladzie pakietu, liczy sie dopiero od nadwyzki.
import type { PackageItemRecord } from "@/lib/data/types";

export type PackageComposition = Record<string, Record<string, number>>;

export function buildPackageComposition(items: PackageItemRecord[]): PackageComposition {
  const out: PackageComposition = {};
  for (const it of items) {
    (out[it.package_id] ??= {})[it.equipment_id] = it.quantity;
  }
  return out;
}
