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
  { key: "RENTAL", title: "Wynajem trwa" },
  { key: "TEARDOWN", title: "Demontaż i powrót" },
];

// Wypożyczalnia — ODBIÓR WŁASNY (klient sam odbiera i zwraca): jedno zadanie w realizacji.
export const RENTAL_SELF_STAGES: StageTemplate[] = [
  { key: "R_START", title: "Rozpocznij" },
  { key: "R_CLEAN_PRE", title: "Kontrola czystości" },
  { key: "R_READY", title: "Przygotowane" },
  { key: "R_RETURN", title: "Klient zwraca" },
  { key: "R_CLEAN_POST", title: "Czyszczenie" },
  { key: "R_CHECK", title: "Kontrola stanu po wynajmie" },
];

// Wypożyczalnia — TRANSPORT po naszej stronie: dwa zadania (dostawa + odbiór) w jednej realizacji.
export const RENTAL_TRANSPORT_STAGES: StageTemplate[] = [
  // Zadanie 1 — dostawa
  { key: "D_START", title: "Rozpocznij dostawę" },
  { key: "D_CLEAN_PRE", title: "Kontrola czystości" },
  { key: "D_TRANSPORT", title: "Transport do klienta" },
  { key: "D_DONE", title: "Dostawa zakończona" },
  // Zadanie 2 — odbiór
  { key: "P_START", title: "Rozpocznij odbiór" },
  { key: "P_CHECK", title: "Kontrola stanu po wynajmie" },
  { key: "P_CLEAN_PUT", title: "Czyszczenie i odłożenie" },
];

// Etapy zależą od linii i (dla wypożyczalni) od trybu odbioru własnego.
export function stagesForReservation(line: BusinessLine, selfPickup = false): StageTemplate[] {
  if (line === "ICLUB") return ICLUB_STAGES;
  return selfPickup ? RENTAL_SELF_STAGES : RENTAL_TRANSPORT_STAGES;
}

// Zgodność wstecz (bez trybu odbioru) — wypożyczalnia domyślnie z transportem.
export function stagesForBusinessLine(line: BusinessLine): StageTemplate[] {
  return stagesForReservation(line, false);
}
