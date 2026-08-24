// Wspólne liczenie zarobku pracownika za zlecenie. Używane w widoku rezerwacji (na żywo)
// oraz przy „zamrażaniu" rozliczenia w chwili zakończenia realizacji (snapshot), żeby
// późniejsza zmiana stawek NIE zmieniała rozliczeń już zakończonych realizacji.
import type { EarningsBreakdown } from "@/lib/domain/earnings";
import { settlementForRealization, rulesFromSettings, numOr, possibleAddonBonuses, type IclubSettlementRules } from "@/lib/domain/iclub-settlement";
import { hasGastroTent } from "@/lib/domain/tents";
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
  upsellValue: number; // §II.12 wartość dosprzedaży; premia = wartość × upsell_percent prowadzącego
}

export function jobEarningsCtx(job: JobWithReservation, settings: AppSettings, farTrip: boolean): JobEarningsCtx {
  return {
    businessLine: job.business_line,
    iclub: job.business_line === "ICLUB",
    rules: rulesFromSettings(settings),
    monthPrefix: (job.event_date ?? "").slice(0, 7),
    farTrip,
    hasGastro: hasGastroTent(job.reservation?.tent_main, job.reservation?.tent_extra),
    rentalFlat: job.reservation?.rental_settlement_flat != null ? Number(job.reservation.rental_settlement_flat) : null,
    ownerBonus: Number(job.owner_bonus ?? 0) || 0,
    hours: settings.iclub_hours,
    upsellValue: Number(job.reservation?.upsell_value ?? 0) || 0,
  };
}

export async function buildAssignmentEarnings(
  ctx: JobEarningsCtx,
  rate: EmployeeRate | null,
  profileId: string,
  isLead = false, // §II.12 premia od dosprzedaży należy się osobie prowadzącej realizację
): Promise<EarningsBreakdown | null> {
  // Wypożyczalnia: wynagrodzenie pracownika to WYŁĄCZNIE ryczałt za zlecenie i/lub bonus szefa.
  // Stawka godzinowa = czas obsługi liczony jako realny KOSZT zlecenia, ale pracownik NIE dostaje
  // dodatkowego wynagrodzenia → nie pokazujemy żadnych zarobków (null). Bez bonusów iClub.
  if (!ctx.iclub) {
    // Opinia/rolka są zawsze możliwe do zgarnięcia — także na wynajmie (rate może być null → wartości domyślne).
    const possible = possibleAddonBonuses(rate);
    if (ctx.rentalFlat != null) {
      return {
        base: ctx.rentalFlat,
        baseLabel: "Ryczałt za zlecenie",
        ownerBonus: ctx.ownerBonus,
        total: Math.round((ctx.rentalFlat + ctx.ownerBonus) * 100) / 100,
        possibleBonuses: possible,
      };
    }
    if (ctx.ownerBonus > 0) {
      return { base: 0, baseLabel: "Bonus szefa", ownerBonus: ctx.ownerBonus, total: ctx.ownerBonus, possibleBonuses: possible };
    }
    // Domyślny wynajem: brak bazy do wypłaty, ale opinia/rolka wciąż możliwe → pokazujemy zachętę.
    return { base: 0, baseLabel: "Bez wypłaty (wynajem)", ownerBonus: 0, total: 0, possibleBonuses: possible };
  }
  // iClub §19: czas wolny za pierwsze N / ryczałt, per pracownik.
  if (!rate) return null;
  const priorCount = ctx.monthPrefix ? await countDoneIclubRealizations(profileId, ctx.monthPrefix) : 0;
  const s = settlementForRealization(ctx.rules, priorCount, { farTrip: ctx.farTrip, hasGastro: ctx.hasGastro, rate });
  // Premia od dosprzedaży tylko dla prowadzącego; procent per pracownik (domyślnie 15%).
  const upsell = isLead ? Math.round(ctx.upsellValue * (numOr(rate.upsell_percent, 15) / 100) * 100) / 100 : 0;
  const labels = s.guaranteed.map((b) => b.label);
  if (upsell > 0) labels.push("Dosprzedaż");
  const guaranteed = labels.join(" + ");
  return {
    base: s.baseValue,
    baseLabel: guaranteed ? `${s.baseLabel} + ${guaranteed}` : s.baseLabel,
    ownerBonus: ctx.ownerBonus,
    total: Math.round((s.total + ctx.ownerBonus + upsell) * 100) / 100,
    possibleBonuses: s.possible,
  };
}
