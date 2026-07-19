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

// iClub: pełny cykl realizacji (§28).
export const ICLUB_STAGES: StageTemplate[] = [
  { key: "PREP", title: "Przygotowanie" },
  { key: "PACKING", title: "Pakowanie" },
  { key: "SETUP", title: "Montaż" },
  { key: "HANDOVER", title: "Przekazanie" },
  { key: "TEARDOWN", title: "Demontaż" },
  { key: "RETURN", title: "Powrót" },
  { key: "UNPACK", title: "Rozpakowanie" },
  { key: "SERVICE", title: "Serwis" },
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
