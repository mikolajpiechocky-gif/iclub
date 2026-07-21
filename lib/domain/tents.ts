// Reguły domenowe namiotów (§10). Wybór przez TYP, nie po konkretnym egzemplarzu.
// Pula dużych = 2 (w tym 1 „z drzwiami z tyłu"); „duży z drzwiami" zajmuje slot puli
// dużych ORAZ konkretny egzemplarz. Mały = 1. Gastronomiczny = konkretny zasób.
import { tentSizeCode } from "./calendar";

export type TentChoice = "M" | "D" | "D_BACKDOOR" | "GASTRO";

export const MAIN_TENT_OPTIONS: { value: TentChoice; label: string }[] = [
  { value: "M", label: "Mały (5,4×5,4)" },
  { value: "D", label: "Duży (6×8)" },
  { value: "D_BACKDOOR", label: "Duży z drzwiami z tyłu" },
];

export const EXTRA_TENT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— brak —" },
  { value: "M", label: "Mały (5,4×5,4)" },
  { value: "D", label: "Duży (6×8)" },
  { value: "D_BACKDOOR", label: "Duży z drzwiami z tyłu" },
  { value: "GASTRO", label: "Namiot gastronomiczny" },
];

export interface TentSlots {
  large: number;
  small: number;
  backdoor: number;
  gastro: number;
}
const ZERO: TentSlots = { large: 0, small: 0, backdoor: 0, gastro: 0 };

export function slotsFor(choice: TentChoice | "" | null | undefined): TentSlots {
  switch (choice) {
    case "M": return { ...ZERO, small: 1 };
    case "D": return { ...ZERO, large: 1 };
    case "D_BACKDOOR": return { ...ZERO, large: 1, backdoor: 1 }; // zajmuje pulę dużych + egzemplarz
    case "GASTRO": return { ...ZERO, gastro: 1 };
    default: return { ...ZERO };
  }
}

export function sumSlots(choices: (TentChoice | "" | null | undefined)[]): TentSlots {
  return choices.reduce<TentSlots>((a, c) => {
    const s = slotsFor(c);
    return { large: a.large + s.large, small: a.small + s.small, backdoor: a.backdoor + s.backdoor, gastro: a.gastro + s.gastro };
  }, { ...ZERO });
}

export function addSlots(a: TentSlots, b: TentSlots): TentSlots {
  return { large: a.large + b.large, small: a.small + b.small, backdoor: a.backdoor + b.backdoor, gastro: a.gastro + b.gastro };
}

export type TentCapacities = TentSlots;
export const DEFAULT_TENT_CAPACITIES: TentCapacities = { large: 2, small: 1, backdoor: 1, gastro: 1 };

// Zwraca nazwy przekroczonych pul (pusta lista = brak overbookingu).
export function exceededPools(existing: TentSlots, mine: TentSlots, cap: TentCapacities): string[] {
  const out: string[] = [];
  if (existing.small + mine.small > cap.small) out.push("mały namiot");
  if (existing.large + mine.large > cap.large) out.push("duży namiot");
  if (existing.backdoor + mine.backdoor > cap.backdoor) out.push("duży z drzwiami z tyłu");
  if (existing.gastro + mine.gastro > cap.gastro) out.push("namiot gastronomiczny");
  return out;
}

// Fallback dla starszych rezerwacji (bez tent_main/extra): typ z rozmiaru + drzwi.
export function choiceFromTent(size: string | null | undefined, hasBackDoor: boolean | undefined | null): TentChoice {
  if (tentSizeCode(size ?? null) === "D") return hasBackDoor ? "D_BACKDOOR" : "D";
  return "M";
}
