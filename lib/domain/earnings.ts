// Reguły domenowe: przewidywany zarobek pracownika za zlecenie (§10).
// iClub domyślnie: 1 realizacja = 8 godzin (do wyliczeń godzinowych/statystyk).
import type { EmployeeRate, BusinessLine } from "@/lib/data/types";
import { possibleAddonBonuses } from "./iclub-settlement";

export const ICLUB_HOURS = 8;

export interface EarningsBreakdown {
  base: number;
  baseLabel: string;
  ownerBonus: number;
  total: number;
  possibleBonuses: { label: string; amount: number }[];
}

export function predictedEarnings(
  rate: EmployeeRate | null,
  businessLine: BusinessLine,
  ownerBonus = 0,
  hours: number = ICLUB_HOURS
): EarningsBreakdown {
  let base = 0;
  let baseLabel = "brak stawki";

  if (rate) {
    const usesFlat =
      rate.iclub_flat != null &&
      (rate.rate_model === "FLAT" || rate.rate_model === "FLAT_PLUS_BONUS" || rate.rate_model === "MIXED");

    if (businessLine === "ICLUB" && usesFlat) {
      base = rate.iclub_flat!;
      baseLabel = "Ryczałt iClub";
    } else if (rate.hourly_rate != null) {
      base = rate.hourly_rate * hours;
      baseLabel = `${hours}h × ${rate.hourly_rate} zł`;
    } else if (rate.iclub_flat != null) {
      base = rate.iclub_flat;
      baseLabel = "Ryczałt";
    }
  }

  const possibleBonuses: { label: string; amount: number }[] = [];
  if (rate?.far_bonus) possibleBonuses.push({ label: "Daleki wyjazd", amount: rate.far_bonus });
  if (rate?.gastro_bonus) possibleBonuses.push({ label: "Namiot gastronomiczny", amount: rate.gastro_bonus });
  // Opinia i rolka — zawsze możliwe do zgarnięcia (także z wynajmu).
  possibleBonuses.push(...possibleAddonBonuses(rate));

  return { base, baseLabel, ownerBonus, total: base + ownerBonus, possibleBonuses };
}
