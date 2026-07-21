// =====================================================================
// Typy warstwy danych (odwzorowują tabele Supabase z migracji 0001).
// Kody techniczne są po angielsku; etykiety do interfejsu — po polsku.
// =====================================================================

export type UserRole = "OWNER" | "EMPLOYEE";
export type CustomerType = "PRIVATE" | "COMPANY";
export type InquiryStatus = "NEW" | "CONTACTED" | "OFFER_SENT" | "WAITING" | "WON" | "LOST" | "REHEATED";
export type InquirySource = "OLX" | "PHONE" | "WEBSITE_FORM" | "REFERRAL" | "FACEBOOK" | "INSTAGRAM" | "OTHER";

export interface ProfileRecord {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null; // avatar (data URL — miniatura zapisana w profilu)
}

export interface CustomerRecord {
  id: string;
  type: CustomerType;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  tax_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InquiryRecord {
  id: string;
  customer_id: string | null;
  event_type: string | null;
  event_date: string | null;
  location: string | null;
  guests: number | null;
  tent_interest: string | null;
  package_interest: string | null;
  addons_note: string | null;
  source: InquirySource | null;
  status: InquiryStatus;
  notes: string | null;
  // §6: śledzenie aktywności, auto-zamykanie i reaktywacja leada
  last_activity_at: string | null;
  auto_close_blocked: boolean;
  lost_reason: string | null;
  reactivation_count: number;
  reactivated_at: string | null;
  previous_status: string | null;
  olx_last_message: string | null;
  created_at: string;
  updated_at: string;
}

// Zapytanie z dołączoną nazwą klienta (do list).
export interface InquiryWithCustomer extends InquiryRecord {
  customer: { id: string; name: string } | null;
}

// --- Etykiety PL ---
export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  PRIVATE: "Osoba prywatna",
  COMPANY: "Firma",
};

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: "Nowe",
  CONTACTED: "Skontaktowano",
  OFFER_SENT: "Oferta wysłana",
  WAITING: "Oczekuje",
  WON: "Wygrane",
  LOST: "Przegrane",
  REHEATED: "Odgrzany",
};

export const INQUIRY_SOURCE_LABELS: Record<InquirySource, string> = {
  OLX: "OLX",
  PHONE: "Telefon",
  WEBSITE_FORM: "Formularz strony",
  REFERRAL: "Polecenie",
  FACEBOOK: "Facebook Marketplace",
  INSTAGRAM: "Instagram",
  OTHER: "Inne",
};

// Kolory statusów zapytania (spójne z paletą designu „Night Event").
export const INQUIRY_STATUS_META: Record<InquiryStatus, { label: string; fg: string; bg: string }> = {
  NEW: { label: "Nowe", fg: "#7fa8f5", bg: "#182238" },
  CONTACTED: { label: "Skontaktowano", fg: "#b98cf5", bg: "#271b3f" },
  OFFER_SENT: { label: "Oferta wysłana", fg: "#ebb05a", bg: "#332814" },
  WAITING: { label: "Oczekuje", fg: "#9aa0b2", bg: "#22242e" },
  WON: { label: "Wygrane", fg: "#5fd68b", bg: "#16301f" },
  LOST: { label: "Przegrane", fg: "#f58585", bg: "#341a1d" },
  REHEATED: { label: "Odgrzany", fg: "#f6a94a", bg: "#33230f" },
};

export const INQUIRY_STATUS_ORDER: InquiryStatus[] = [
  "NEW", "CONTACTED", "OFFER_SENT", "WAITING", "REHEATED", "WON", "LOST",
];

// =====================================================================
// Zasoby (namioty, pakiety, dodatki) i rezerwacje — migracje 0002 / 0003
// =====================================================================
export type BusinessLine = "ICLUB" | "EQUIPMENT_RENTAL";
export type TentStatus = "AVAILABLE" | "RESERVED" | "ON_SITE" | "SERVICE" | "DAMAGED";
export type ReservationStatus = "TEMPORARY" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
export type JobStatus = "PLANNED" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type StageStatus = "TODO" | "IN_PROGRESS" | "DONE" | "SKIPPED";

export interface TentRecord {
  id: string;
  code: string;
  name: string;
  size: string | null;
  set_color: string | null;
  has_back_door: boolean;
  status: TentStatus;
  notes: string | null;
}

export interface PackageRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  base_price: number;
  active: boolean;
  sort: number;
  assembly_minutes: number; // §9.2 standardowy czas montażu pakietu (minuty)
}

export interface AddonRecord {
  id: string;
  code: string;
  name: string;
  price: number;
  active: boolean;
  sort: number;
}

// §11.1 Pozycja składu pakietu (ile czego zawiera pakiet).
export interface PackageItemRecord {
  id: string;
  package_id: string;
  equipment_id: string;
  quantity: number;
  sort: number;
  equipment: { id: string; name: string; unit: string | null } | null;
}

// §12 Dodatek w rezerwacji — wzbogacony o dane z magazynu (zdjęcie, dostępność).
export interface ReservationAddon {
  id: string;
  code: string;
  name: string;
  price: number;
  photo_url: string | null; // z magazynu (jeśli pozycja magazynowa)
  available: number | null; // ilość na stanie (jeśli z magazynu)
}

// §11.2 Snapshot wyceny rezerwacji — kopia z chwili zapisu (odporna na zmiany cennika).
export interface PricingSnapshot {
  package: { name: string; price: number } | null;
  addons: { name: string; price: number }[];
  transport_price: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  deposit: number;
  total: number;
  saved_at: string;
}

export interface ReservationRecord {
  id: string;
  business_line: BusinessLine;
  customer_id: string | null;
  inquiry_id: string | null;
  event_type: string | null;
  event_date: string | null;
  setup_date: string | null;
  teardown_date: string | null;
  location: string | null;
  guests: number | null;
  tent_id: string | null;
  tent_id_2: string | null;
  tent_main: string | null;
  tent_extra: string | null;
  overbooking_override: boolean;
  overbooking_reason: string | null;
  package_id: string | null;
  addon_ids: string[];
  addon_qty: Record<string, number> | null; // §12.2 ilość per dodatek (domyślnie 1)
  rental_items: string | null;
  delivery_time: string | null;
  payment_upfront: boolean;
  price: number | null;
  discount: number;            // faktyczna kwota rabatu (zł, wyliczona)
  discount_type: string;       // §13.4 AMOUNT | PERCENT
  discount_value: number | null; // wartość wprowadzona (% lub zł)
  transport_price: number | null; // §13.3 cena transportu dla klienta
  deposit: number;
  // §9 Godziny montażu
  event_start_time: string | null;  // godzina rozpoczęcia imprezy (HH:MM)
  assembly_time: string | null;     // ustalona (ręcznie) godzina montażu
  assembly_time_by: string | null;  // kto ustalił ręcznie
  assembly_time_at: string | null;  // kiedy ustalono ręcznie
  pricing_snapshot: PricingSnapshot | null; // §11.2 kopia wyceny z chwili zapisu
  is_invoice: boolean;
  source: string | null;
  status: ReservationStatus;
  expires_at: string | null;
  notes: string | null;
  client_confirmed: boolean;
  client_confirmed_at: string | null;
  invoice_issued: boolean;
  invoice_issued_at: string | null;
  invoice_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithRefs extends ReservationRecord {
  customer: { id: string; name: string; city?: string | null } | null;
  tent: { id: string; name: string; size?: string | null } | null;
  tent2?: { id: string; name: string; size: string | null } | null;
  package: { id: string; name: string } | null;
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  TEMPORARY: "Tymczasowa",
  CONFIRMED: "Potwierdzona",
  CANCELLED: "Anulowana",
  EXPIRED: "Wygasła",
};

export const RESERVATION_STATUS_META: Record<ReservationStatus, { label: string; fg: string; bg: string }> = {
  TEMPORARY: { label: "Tymczasowa", fg: "#ebb05a", bg: "#332814" },
  CONFIRMED: { label: "Potwierdzona", fg: "#5fd68b", bg: "#16301f" },
  CANCELLED: { label: "Anulowana", fg: "#9aa0b2", bg: "#22242e" },
  EXPIRED: { label: "Wygasła", fg: "#f58585", bg: "#341a1d" },
};

export const RESERVATION_STATUS_ORDER: ReservationStatus[] = [
  "TEMPORARY", "CONFIRMED", "CANCELLED", "EXPIRED",
];

export interface JobRecord {
  id: string;
  reservation_id: string | null;
  business_line: BusinessLine;
  title: string | null;
  event_date: string | null;
  status: JobStatus;
  owner_bonus: number;
  created_at: string;
  updated_at: string;
}

export interface JobStageRecord {
  id: string;
  job_id: string;
  stage_key: string;
  title: string;
  status: StageStatus;
  sort: number;
  planned_at: string | null;
}

export interface JobWithReservation extends JobRecord {
  reservation: ReservationWithRefs | null;
}

export const JOB_STATUS_META: Record<JobStatus, { label: string; fg: string; bg: string }> = {
  PLANNED: { label: "Zaplanowane", fg: "#7fa8f5", bg: "#182238" },
  IN_PROGRESS: { label: "W realizacji", fg: "#b98cf5", bg: "#271b3f" },
  DONE: { label: "Zakończone", fg: "#5fd68b", bg: "#16301f" },
  CANCELLED: { label: "Anulowane", fg: "#9aa0b2", bg: "#22242e" },
};

export const STAGE_STATUS_META: Record<StageStatus, { label: string; fg: string; bg: string }> = {
  TODO: { label: "Do zrobienia", fg: "#9aa0b2", bg: "#22242e" },
  IN_PROGRESS: { label: "W toku", fg: "#b98cf5", bg: "#271b3f" },
  DONE: { label: "Gotowe", fg: "#5fd68b", bg: "#16301f" },
  SKIPPED: { label: "Pominięte", fg: "#6b7180", bg: "#1a1c24" },
};

export type RateModel = "FLAT" | "HOURLY" | "FLAT_PLUS_BONUS" | "HOURLY_PLUS_BONUS" | "MIXED";

export const RATE_MODEL_LABELS: Record<RateModel, string> = {
  FLAT: "Ryczałt",
  HOURLY: "Godzinowo",
  FLAT_PLUS_BONUS: "Ryczałt + premie",
  HOURLY_PLUS_BONUS: "Godzinowo + premie",
  MIXED: "Mieszany",
};

export const RATE_MODEL_ORDER: RateModel[] = [
  "FLAT", "HOURLY", "FLAT_PLUS_BONUS", "HOURLY_PLUS_BONUS", "MIXED",
];

export interface EmployeeRate {
  profile_id: string;
  rate_model: RateModel;
  hourly_rate: number | null;
  iclub_flat: number | null;
  far_bonus: number | null;
  gastro_bonus: number | null;
  review_bonus: number | null;
  reel_bonus: number | null;
  upsell_percent: number | null;
  notes: string | null;
}

export interface EmployeeWithRate extends ProfileRecord {
  rate: EmployeeRate | null;
}

export interface VehicleRecord {
  id: string;
  name: string;
  registration: string | null;
  type: string | null;
  fuel_type: string | null;
  consumption: number | null;
  capacity: string | null;
  mileage: number | null;
  insurance_date: string | null;
  inspection_date: string | null;
  notes: string | null;
  active: boolean;
}

export type ContractStatus = "DRAFT" | "SENT" | "SIGNED";
export const CONTRACT_STATUS_META: Record<ContractStatus, { label: string; fg: string; bg: string }> = {
  DRAFT: { label: "Szkic", fg: "#9aa0b2", bg: "#22242e" },
  SENT: { label: "Wysłana", fg: "#7fa8f5", bg: "#182238" },
  SIGNED: { label: "Podpisana", fg: "#5fd68b", bg: "#16301f" },
};

export type ServiceStatus = "OPEN" | "IN_PROGRESS" | "DONE";
export const SERVICE_KINDS = ["Sprawdzenie", "Czyszczenie", "Naprawa", "Inne"];
export const SERVICE_STATUS_META: Record<ServiceStatus, { label: string; fg: string; bg: string }> = {
  OPEN: { label: "Otwarte", fg: "#f58585", bg: "#341a1d" },
  IN_PROGRESS: { label: "W toku", fg: "#ebb05a", bg: "#332814" },
  DONE: { label: "Zrobione", fg: "#5fd68b", bg: "#16301f" },
};

export interface ServiceTaskRecord {
  id: string;
  equipment: string | null;
  kind: string;
  description: string | null;
  status: ServiceStatus;
  due_date: string | null;
  created_at: string;
}

export interface AvailabilityRecord {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  note: string | null;
  created_at: string;
}

export interface AvailabilityWithProfile extends AvailabilityRecord {
  profile: { id: string; full_name: string } | null;
}

export type IncidentPriority = "LOW" | "MEDIUM" | "HIGH";
export type IncidentStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export const INCIDENT_CATEGORIES = [
  "Uszkodzenie", "Awaria", "Brak sprzętu", "Pogoda", "Klient", "Obiekt",
  "Zasilanie", "Dmuchawa", "Palenie", "Zapotrzebowanie", "Pojazd", "Inne",
];

export const INCIDENT_PRIORITY_LABELS: Record<IncidentPriority, string> = {
  LOW: "Niska", MEDIUM: "Średnia", HIGH: "Wysoka",
};
export const INCIDENT_PRIORITY_META: Record<IncidentPriority, { label: string; fg: string; bg: string }> = {
  LOW: { label: "Niska", fg: "#9aa0b2", bg: "#22242e" },
  MEDIUM: { label: "Średnia", fg: "#ebb05a", bg: "#332814" },
  HIGH: { label: "Wysoka", fg: "#f58585", bg: "#341a1d" },
};
export const INCIDENT_STATUS_META: Record<IncidentStatus, { label: string; fg: string; bg: string }> = {
  OPEN: { label: "Otwarte", fg: "#f58585", bg: "#341a1d" },
  IN_PROGRESS: { label: "W toku", fg: "#ebb05a", bg: "#332814" },
  RESOLVED: { label: "Rozwiązane", fg: "#5fd68b", bg: "#16301f" },
};

export interface IncidentRecord {
  id: string;
  job_id: string | null;
  category: string;
  description: string | null;
  equipment: string | null;
  priority: IncidentPriority;
  status: IncidentStatus;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentWithJob extends IncidentRecord {
  job: { id: string; title: string | null } | null;
}

export interface ChecklistItemRecord {
  id: string;
  job_id: string;
  category: string;
  label: string;
  qty: string | null;
  required: boolean;
  done: boolean;
  problem: boolean;
  sort: number;
}

export type PaymentMethod = "CASH" | "TRANSFER" | "BLIK" | "CARD";
export type PaymentStatus = "PLANNED" | "REPORTED" | "PAID" | "OVERDUE" | "REFUNDED";
export type CostStatus = "PENDING" | "VERIFIED";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Gotówka", TRANSFER: "Przelew", BLIK: "BLIK", CARD: "Karta",
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; fg: string; bg: string }> = {
  PLANNED: { label: "Zaplanowana", fg: "#7fa8f5", bg: "#182238" },
  REPORTED: { label: "Zgłoszono odbiór", fg: "#ebb05a", bg: "#332814" },
  PAID: { label: "Zapłacone", fg: "#5fd68b", bg: "#16301f" },
  OVERDUE: { label: "Zaległa", fg: "#f58585", bg: "#341a1d" },
  REFUNDED: { label: "Zwrot", fg: "#9aa0b2", bg: "#22242e" },
};
export const PAYMENT_STATUS_ORDER: PaymentStatus[] = ["PLANNED", "REPORTED", "PAID", "OVERDUE", "REFUNDED"];

export const COST_STATUS_META: Record<CostStatus, { label: string; fg: string; bg: string }> = {
  PENDING: { label: "Do weryfikacji", fg: "#ebb05a", bg: "#332814" },
  VERIFIED: { label: "Zweryfikowany", fg: "#5fd68b", bg: "#16301f" },
};

export const COST_CATEGORIES = [
  "Paliwo", "Autostrada", "Parking", "Hotel", "Dieta", "Wynagrodzenie",
  "Premia", "Serwis", "Czyszczenie", "Zakup", "Materiały", "Inne",
];

export interface PaymentRecord {
  id: string;
  job_id: string | null;
  title: string | null;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithJob extends PaymentRecord {
  job: { id: string; title: string | null } | null;
}

export interface CostRecord {
  id: string;
  job_id: string | null;
  category: string;
  amount: number;
  spent_on: string | null;
  note: string | null;
  status: CostStatus;
  created_at: string;
  updated_at: string;
}

export interface CostWithJob extends CostRecord {
  job: { id: string; title: string | null } | null;
}

// Inwestycja: majątek włożony w iClub. NIE jest kosztem realizacji — służy tylko
// do oceny zwrotu (suma włożona vs zysk narastająco).
export interface InvestmentRecord {
  id: string;
  name: string;
  amount: number;
  category: string;
  note: string | null;
  created_at: string;
}

export type EquipmentStatus = "AVAILABLE" | "SERVICE" | "DAMAGED" | "CLEANING";

export interface EquipmentRecord {
  id: string;
  code: string;
  name: string;
  category: string | null;
  quantity: number;
  tracking: string; // QUANTITY | INDIVIDUAL
  unit_cost: number | null;        // cena zakupu brutto
  status: EquipmentStatus;
  notes: string | null;
  active: boolean;                 // false = wycofane
  // §17 rozszerzony model magazynu
  unit: string | null;             // jednostka (szt., kpl., m…)
  location: string | null;         // lokalizacja magazynowa
  set_number: string | null;       // numer zestawu
  purchase_date: string | null;    // data zakupu
  supplier: string | null;         // dostawca
  rental_price: number | null;     // cena wynajmu brutto
  replacement_value: number | null; // wartość odtworzeniowa
  is_rentable: boolean;            // możliwa do wynajęcia
  is_addon: boolean;               // widoczna jako dodatek w rezerwacji
  internal_only: boolean;          // tylko do użytku wewnętrznego
  photo_url: string | null;        // §17 zdjęcie pozycji (miniatura, data URL)
}

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  AVAILABLE: "Dostępny",
  SERVICE: "Serwis",
  DAMAGED: "Uszkodzony",
  CLEANING: "Czyszczenie",
};

export const EQUIPMENT_STATUS_META: Record<EquipmentStatus, { label: string; fg: string; bg: string }> = {
  AVAILABLE: { label: "Dostępny", fg: "#5fd68b", bg: "#16301f" },
  SERVICE: { label: "Serwis", fg: "#ebb05a", bg: "#332814" },
  DAMAGED: { label: "Uszkodzony", fg: "#f58585", bg: "#341a1d" },
  CLEANING: { label: "Czyszczenie", fg: "#7fa8f5", bg: "#182238" },
};

export const EQUIPMENT_STATUS_ORDER: EquipmentStatus[] = ["AVAILABLE", "CLEANING", "SERVICE", "DAMAGED"];

// §17.3 Wpis audytu zmian magazynowych (autor, data, stara/nowa wartość).
export interface InventoryAuditRecord {
  id: string;
  item_id: string | null;
  item_name: string | null;
  action: "create" | "update" | "delete" | "restore";
  changes: Record<string, { old: unknown; new: unknown }> | null;
  actor: string | null;
  actor_name: string | null;
  created_at: string;
}
