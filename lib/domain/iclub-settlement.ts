// §19 Reguły rozliczenia realizacji iClub (konfigurowalne, „Bartek" jako seed).
// Pierwsze N realizacji w miesiącu = czas wolny (wartość rozliczeniowa = godziny ×
// stawka). Kolejne = ryczałt + premie. Mnożnik przejazdu NIE zmienia wynagrodzenia.
import type { EmployeeRate, IclubSettlementMode } from "@/lib/data/types";

// Domyślne premie (§19.3) — nadpisywane wartościami ze stawki pracownika, jeśli są.
export const DEFAULT_BONUSES = { far: 150, gastro: 150, review: 20, reel: 50 } as const;

// PostgREST zwraca kolumny numeric jako STRING — koercja do liczby, by uniknąć
// konkatenacji przy sumowaniu (np. „259.2" + „150" → błędny wynik zamiast dodawania).
export const numOr = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return v != null && v !== "" && Number.isFinite(n) ? n : fallback;
};

export interface IclubSettlementRules {
  freeHours: number;        // godziny czasu wolnego za realizację (np. 8)
  hourlyRate: number;       // stawka czasu wolnego zł/h (np. 32,40)
  monthlyThreshold: number; // liczba pierwszych realizacji na czas wolny (np. 4)
  flatRate: number;         // ryczałt od kolejnej realizacji (np. 500)
}

export interface Bonus { label: string; amount: number }

// Add-ony możliwe do zgarnięcia niezależnie od linii i trybu: opinia i rolka.
// (Także z wynajmu — pracownik dostaje je za wystawioną opinię / nagraną rolkę.)
export function possibleAddonBonuses(rate?: EmployeeRate | null): Bonus[] {
  return [
    { label: "Opinia", amount: numOr(rate?.review_bonus, DEFAULT_BONUSES.review) },
    { label: "Rolka", amount: numOr(rate?.reel_bonus, DEFAULT_BONUSES.reel) },
  ];
}

export interface RealizationSettlement {
  index: number;               // która to realizacja w miesiącu (1-based)
  form: "free_time" | "flat";
  freeHours: number | null;    // godziny czasu wolnego (dla formy free_time)
  baseValue: number;           // wartość bazy (czas wolny wyceniony albo ryczałt)
  baseLabel: string;
  guaranteed: Bonus[];         // premie należne na pewno dla tej realizacji
  possible: Bonus[];           // premie możliwe do uzyskania (opinia, rolka)
  guaranteedTotal: number;
  total: number;               // baseValue + guaranteedTotal (wartość „do zgarnięcia")
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// §19.1 Czas wolny wyrażony w dniach (8 h = 1 dzień roboczy w Taurusie).
export function freeTimeLabel(freeHours: number): string {
  const days = freeHours / 8;
  if (Number.isInteger(days) && days >= 1) return days === 1 ? "1 dzień wolny" : `${days} dni wolne`;
  return `${freeHours} h czasu wolnego`;
}

export function rulesFromSettings(s: { iclub_hours: number; iclub_hourly_rate: number; iclub_month_threshold: number; iclub_flat_rate: number }): IclubSettlementRules {
  return {
    freeHours: s.iclub_hours,
    hourlyRate: s.iclub_hourly_rate,
    monthlyThreshold: s.iclub_month_threshold,
    flatRate: s.iclub_flat_rate,
  };
}

// Rozliczenie pojedynczej realizacji. priorCompletedThisMonth = ile realizacji
// pracownik już zaliczył w tym miesiącu (ta będzie kolejna).
// Tryb per pracownik: THRESHOLD = czas wolny za pierwsze N, potem ryczałt (Bartek);
// FLAT = ryczałt od pierwszej realizacji. Ryczałt = stawka pracownika (iclub_flat) albo globalny.
export function settlementForRealization(
  rules: IclubSettlementRules,
  priorCompletedThisMonth: number,
  opts: { farTrip?: boolean; hasGastro?: boolean; rate?: EmployeeRate | null; mode?: IclubSettlementMode } = {},
): RealizationSettlement {
  const index = priorCompletedThisMonth + 1;
  const rate = opts.rate ?? null;
  // Tryb per pracownik: THRESHOLD = czas wolny za pierwsze N, potem ryczałt (Bartek);
  // FLAT = ryczałt od PIERWSZEJ realizacji (drugi pracownik).
  // Domyślnie FLAT — zgodnie z domyślną wartością kolumny employee_rates.iclub_settlement_mode w bazie.
  const mode: IclubSettlementMode = opts.mode ?? rate?.iclub_settlement_mode ?? "FLAT";
  const flatRate = numOr(rate?.iclub_flat, rules.flatRate); // ryczałt pracownika albo globalny
  const threshold = numOr(rate?.iclub_threshold, rules.monthlyThreshold); // próg „w ramach umowy" per pracownik
  // Czas wolny: godziny i stawka zł/h per pracownik (null = wartości globalne z Ustawień).
  const cfgHours = numOr(rate?.iclub_free_hours, rules.freeHours);
  const cfgHourly = numOr(rate?.iclub_free_hourly, rules.hourlyRate);

  let form: "free_time" | "flat";
  let baseValue: number;
  let baseLabel: string;
  let freeHours: number | null;

  // §19 THRESHOLD: pierwsze N realizacji w miesiącu = czas wolny (godziny × stawka), kolejne = ryczałt.
  // FLAT: zawsze ryczałt (od pierwszej). Dzięki temu ryczałtowy pracownik NIE dostaje czasu wolnego.
  if (mode === "THRESHOLD" && threshold > 0 && index <= threshold) {
    form = "free_time";
    freeHours = cfgHours;
    baseValue = round2(cfgHours * cfgHourly);
    baseLabel = freeTimeLabel(cfgHours);
  } else {
    form = "flat";
    freeHours = null;
    baseValue = flatRate;
    baseLabel = "Ryczałt za realizację";
  }

  const farAmt = numOr(rate?.far_bonus, DEFAULT_BONUSES.far);
  const gastroAmt = numOr(rate?.gastro_bonus, DEFAULT_BONUSES.gastro);

  const guaranteed: Bonus[] = [];
  // Daleki wyjazd (>100 km) to realny koszt/wysiłek pracownika — należy się przy KAŻDEJ dalekiej
  // realizacji, niezależnie od formy (czas wolny/ryczałt) i trybu (THRESHOLD/FLAT). Wcześniej liczył
  // się tylko w ramach umowy (free_time), przez co w trybie mieszanym po progu przepadał.
  if (opts.farTrip) guaranteed.push({ label: "Daleki wyjazd (>100 km)", amount: farAmt });
  if (opts.hasGastro) guaranteed.push({ label: "Namiot gastronomiczny", amount: gastroAmt });

  const possible: Bonus[] = possibleAddonBonuses(rate);

  const guaranteedTotal = guaranteed.reduce((s, b) => s + b.amount, 0);
  return {
    index,
    form,
    freeHours,
    baseValue,
    baseLabel,
    guaranteed,
    possible,
    guaranteedTotal,
    total: round2(baseValue + guaranteedTotal),
  };
}
