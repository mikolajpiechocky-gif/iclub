// Reguły domenowe: przewidywany zarobek pracownika za zlecenie (§10).
// iClub domyślnie: 1 realizacja = 8 godzin (do wyliczeń godzinowych/statystyk).
import type { EmployeeRate, BusinessLine } from "@/lib/data/types";
import { possibleAddonBonuses, numOr } from "./iclub-settlement";

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
      base = numOr(rate.iclub_flat, 0);
      baseLabel = "Ryczałt iClub";
    } else if (rate.hourly_rate != null) {
      base = numOr(rate.hourly_rate, 0) * hours;
      baseLabel = `${hours}h × ${rate.hourly_rate} zł`;
    } else if (rate.iclub_flat != null) {
      base = numOr(rate.iclub_flat, 0);
      baseLabel = "Ryczałt";
    }
  }

  const ob = numOr(ownerBonus, 0);
  const possibleBonuses: { label: string; amount: number }[] = [];
  if (rate?.far_bonus) possibleBonuses.push({ label: "Daleki wyjazd", amount: numOr(rate.far_bonus, 0) });
  if (rate?.gastro_bonus) possibleBonuses.push({ label: "Namiot gastronomiczny", amount: numOr(rate.gastro_bonus, 0) });
  // Opinia i rolka — zawsze możliwe do zgarnięcia (także z wynajmu).
  possibleBonuses.push(...possibleAddonBonuses(rate));

  return { base, baseLabel, ownerBonus: ob, total: base + ob, possibleBonuses };
}
