// §19 Reguły rozliczenia realizacji iClub (konfigurowalne, „Bartek" jako seed).
// Pierwsze N realizacji w miesiącu = czas wolny (wartość rozliczeniowa = godziny ×
// stawka). Kolejne = ryczałt + premie. Mnożnik przejazdu NIE zmienia wynagrodzenia.
import type { EmployeeRate, IclubSettlementMode } from "@/lib/data/types";

// Domyślne premie (§19.3) — nadpisywane wartościami ze stawki pracownika, jeśli są.
export const DEFAULT_BONUSES = { far: 150, gastro: 150, review: 20, reel: 50 } as const;

export interface IclubSettlementRules {
  freeHours: number;        // godziny czasu wolnego za realizację (np. 8)
  hourlyRate: number;       // stawka czasu wolnego zł/h (np. 32,40)
  monthlyThreshold: number; // liczba pierwszych realizacji na czas wolny (np. 4)
  flatRate: number;         // ryczałt od kolejnej realizacji (np. 500)
}

export interface Bonus { label: string; amount: number }

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
  const mode: IclubSettlementMode = opts.mode ?? rate?.iclub_settlement_mode ?? "FLAT";
  const flatRate = rate?.iclub_flat ?? rules.flatRate; // ryczałt pracownika albo globalny
  const threshold = rate?.iclub_threshold ?? rules.monthlyThreshold; // próg „w ramach umowy" per pracownik

  let form: "free_time" | "flat";
  let baseValue: number;
  let baseLabel: string;
  let freeHours: number | null;

  if (mode === "THRESHOLD" && index <= threshold) {
    form = "free_time";
    freeHours = rules.freeHours;
    baseValue = round2(rules.freeHours * rules.hourlyRate);
    baseLabel = freeTimeLabel(rules.freeHours);
  } else {
    form = "flat";
    freeHours = null;
    baseValue = flatRate;
    baseLabel = "Ryczałt za realizację";
  }

  const farAmt = rate?.far_bonus ?? DEFAULT_BONUSES.far;
  const gastroAmt = rate?.gastro_bonus ?? DEFAULT_BONUSES.gastro;
  const reviewAmt = rate?.review_bonus ?? DEFAULT_BONUSES.review;
  const reelAmt = rate?.reel_bonus ?? DEFAULT_BONUSES.reel;

  const guaranteed: Bonus[] = [];
  if (opts.farTrip) guaranteed.push({ label: "Daleki wyjazd (>100 km)", amount: farAmt });
  if (opts.hasGastro) guaranteed.push({ label: "Namiot gastronomiczny", amount: gastroAmt });

  const possible: Bonus[] = [
    { label: "Opinia", amount: reviewAmt },
    { label: "Rolka", amount: reelAmt },
  ];

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
