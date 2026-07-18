// =====================================================================
// iClub Management — typy domenowe (warstwa demonstracyjna)
// UWAGA: to modele UI dla danych demo. Docelowe typy backendu (Supabase)
// mogą się różnić — patrz komentarze // TODO(backend).
// =====================================================================

export type Role = "OWNER" | "EMPLOYEE";

// Uniwersalny słownik statusów UI (kolor + ikona + nazwa).
export type StatusKey =
  | "planned"      // zaplanowane (niebieski)
  | "inprogress"   // w realizacji (fiolet)
  | "loading"      // załadunek (żółty)
  | "done"         // zakończone / zapłacone / dostępne (zielony)
  | "conflict"     // konflikt / brak / szkoda / opóźnienie (czerwony)
  | "available"    // dostępny (zielony)
  | "onsite"       // na realizacji (fiolet)
  | "damaged"      // uszkodzony (czerwony)
  | "service"      // w serwisie (żółty)
  | "paid"         // zapłacone (zielony)
  | "reported"     // zgłoszono odbiór (żółty)
  | "pending"      // oczekuje (szary)
  | "cancelled";   // anulowane (szary)

export type SyncState =
  | "online"
  | "offline"
  | "syncing"
  | "pending"      // zmiany zapisane lokalnie, czekają na wysyłkę
  | "error"
  | "synced";

export type InquirySource =
  | "OLX"
  | "Telefon"
  | "Formularz strony"
  | "Polecenie"
  | "Facebook Marketplace"
  | "Instagram";

export type EventType =
  | "Urodziny"
  | "Osiemnastka"
  | "Wieczór panieński"
  | "Wieczór kawalerski"
  | "Impreza firmowa"
  | "Wesele"
  | "Impreza w ogrodzie"
  | "Impreza tematyczna";

export type PaymentMethod = "Gotówka" | "Przelew" | "BLIK" | "Karta";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
}

export interface Inquiry {
  id: string;
  customer: string;
  source: InquirySource;
  eventDate: string;      // ISO
  city: string;
  guests: number;
  interest: string;       // interesujący namiot / sprzęt
  status: StatusKey;
  owner: string;          // osoba prowadząca
  lastContact: string;    // ISO
}

export interface ScheduleStep {
  time: string;           // "12:30"
  date: string;           // "18 lip"
  title: string;          // Transport / Montaż / ...
  desc: string;
  key: "transport" | "montaz" | "start" | "koniec" | "demontaz" | "powrot";
}

export interface Job {
  id: string;             // np. "1042"
  title: string;
  status: StatusKey;
  eventType: EventType;
  guests: number;
  dateRange: string;      // "18–19 lipca 2026"
  customer: Customer;
  address: string;
  route: string;          // "24 km · 32 min"
  tent: string;           // "6×8 Blue"
  packageName: string;    // "Pakiet Premium"
  addons: string[];
  crew: string[];
  vehicle: string;
  value: number;
  deposit: number;
  schedule: ScheduleStep[];
}

export interface Tent {
  id: string;
  name: string;           // "Namiot 6×8 Blue"
  code: string;           // "TENT-01"
  status: StatusKey;
  location: string;
}

export interface GearItem {
  id: string;
  name: string;
  total: number;
  available: number;
  reserved: number;
  damaged: number;
  tracking: "quantity" | "individual";
}

export interface ChecklistItemData {
  id: string;
  label: string;
  category: string;
  qty?: string;
  required: boolean;
  done: boolean;
  problem?: boolean;
}

export interface CostData {
  id: string;
  amount: number;
  category: string;
  jobId: string;
  employee: string;
  date: string;
  note?: string;
  status: StatusKey;      // pending / done (zweryfikowany)
}

export interface PaymentData {
  id: string;
  title: string;
  method: PaymentMethod;
  amount: number;
  meta: string;
  status: StatusKey;      // paid / reported / pending / conflict(zaległa)
}

export interface DamageData {
  id: string;
  gear: string;
  description: string;
  urgency: "Niska" | "Średnia" | "Wysoka";
  jobId: string;
  savedOffline: boolean;
}

// TODO(backend): id-ki, timestampy, relacje i statusy zostaną
// zdefiniowane przy podłączeniu Supabase.
