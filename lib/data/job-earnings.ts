// Wspólne liczenie zarobku pracownika za zlecenie. Używane w widoku rezerwacji (na żywo)
// oraz przy „zamrażaniu" rozliczenia w chwili zakończenia realizacji (snapshot), żeby
// późniejsza zmiana stawek NIE zmieniała rozliczeń już zakończonych realizacji.
import type { EarningsBreakdown } from "@/lib/domain/earnings";
import { predictedEarnings } from "@/lib/domain/earnings";
import { settlementForRealization, rulesFromSettings, possibleAddonBonuses, type IclubSettlementRules } from "@/lib/domain/iclub-settlement";
import { countDoneIclubRealizations } from "./jobs";
import type { AppSettings } from "./settings";
import type { BusinessLine, EmployeeRate, JobWithReservation } from "./types";

export interface JobEarningsCtx {
  businessLine: BusinessLine;
  iclub: boolean;
  rules: IclubSettlementRules;
  monthPrefix: string;
  farTrip: boolean;
  hasGastro: boolean;
  rentalFlat: number | null;
  ownerBonus: number;
  hours: number;
}

export function jobEarningsCtx(job: JobWithReservation, settings: AppSettings, farTrip: boolean): JobEarningsCtx {
  return {
    businessLine: job.business_line,
    iclub: job.business_line === "ICLUB",
    rules: rulesFromSettings(settings),
    monthPrefix: (job.event_date ?? "").slice(0, 7),
    farTrip,
    hasGastro: job.reservation?.tent_extra === "GASTRO",
    rentalFlat: job.reservation?.rental_settlement_flat != null ? Number(job.reservation.rental_settlement_flat) : null,
    ownerBonus: Number(job.owner_bonus ?? 0) || 0,
    hours: settings.iclub_hours,
  };
}

export async function buildAssignmentEarnings(
  ctx: JobEarningsCtx,
  rate: EmployeeRate | null,
  profileId: string,
): Promise<EarningsBreakdown | null> {
  // Wypożyczalnia: ryczałt per zlecenie (nadrzędny) albo model stawki.
  if (!ctx.iclub) {
    if (ctx.rentalFlat != null) {
      return {
        base: ctx.rentalFlat,
        baseLabel: "Ryczałt za zlecenie",
        ownerBonus: ctx.ownerBonus,
        total: Math.round((ctx.rentalFlat + ctx.ownerBonus) * 100) / 100,
        possibleBonuses: possibleAddonBonuses(rate),
      };
    }
    return rate ? predictedEarnings(rate, ctx.businessLine, ctx.ownerBonus, ctx.hours) : null;
  }
  // iClub §19: czas wolny za pierwsze N / ryczałt, per pracownik.
  if (!rate) return null;
  const priorCount = ctx.monthPrefix ? await countDoneIclubRealizations(profileId, ctx.monthPrefix) : 0;
  const s = settlementForRealization(ctx.rules, priorCount, { farTrip: ctx.farTrip, hasGastro: ctx.hasGastro, rate });
  const guaranteed = s.guaranteed.map((b) => b.label).join(" + ");
  return {
    base: s.baseValue,
    baseLabel: guaranteed ? `${s.baseLabel} + ${guaranteed}` : s.baseLabel,
    ownerBonus: ctx.ownerBonus,
    total: Math.round((s.total + ctx.ownerBonus) * 100) / 100,
    possibleBonuses: s.possible,
  };
}
