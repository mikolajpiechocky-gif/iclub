// =====================================================================
// Reguły domenowe: szablony etapów zlecenia (job_stages).
// Etapy generowane automatycznie przy tworzeniu zlecenia z rezerwacji (§28).
// Szablony są tu (domena), nie zaszyte w komponentach UI.
// =====================================================================
import type { BusinessLine } from "@/lib/data/types";

export interface StageTemplate {
  key: string;
  title: string;
}

// iClub: przebieg dnia realizacji (§19/§28). Pakowanie jest osobnym blokiem
// (dzień przed), pozostałe kroki to właściwa realizacja w terenie — każdy krok
// ma inne czynności, dlatego w panelu pracownika renderują się jako osobne
// zadania, a nie jedna lista „do odhaczenia”.
export const ICLUB_STAGES: StageTemplate[] = [
  { key: "PACKING", title: "Pakowanie" },
  { key: "TRAVEL", title: "W drodze" },
  { key: "SETUP", title: "Montaż" },
  { key: "TRAINING", title: "Szkolenie klienta" },
  { key: "PHOTOS", title: "Zdjęcia" },
  { key: "SETTLEMENT", title: "Rozliczenie" },
  { key: "TEARDOWN", title: "Demontaż i powrót" },
];

// Wypożyczalnia z dostawą (§28) — użyjemy przy module wypożyczalni (Faza 11).
export const EQUIPMENT_DELIVERY_STAGES: StageTemplate[] = [
  { key: "PREP", title: "Przygotowanie" },
  { key: "CLEANING", title: "Czyszczenie" },
  { key: "PACKING", title: "Pakowanie" },
  { key: "DELIVERY", title: "Dostawa" },
  { key: "UNLOAD", title: "Rozładunek" },
  { key: "RETURN_TRIP", title: "Powrót" },
  { key: "PICKUP", title: "Odbiór" },
  { key: "CHECK", title: "Kontrola" },
  { key: "CLEANING2", title: "Czyszczenie" },
  { key: "PUTAWAY", title: "Odłożenie" },
];

export function stagesForBusinessLine(line: BusinessLine): StageTemplate[] {
  return line === "ICLUB" ? ICLUB_STAGES : EQUIPMENT_DELIVERY_STAGES;
}
