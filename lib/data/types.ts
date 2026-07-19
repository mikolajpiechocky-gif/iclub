// =====================================================================
// Typy warstwy danych (odwzorowują tabele Supabase z migracji 0001).
// Kody techniczne są po angielsku; etykiety do interfejsu — po polsku.
// =====================================================================

export type UserRole = "OWNER" | "EMPLOYEE";
export type CustomerType = "PRIVATE" | "COMPANY";
export type InquiryStatus = "NEW" | "CONTACTED" | "OFFER_SENT" | "WAITING" | "WON" | "LOST";
export type InquirySource = "OLX" | "PHONE" | "WEBSITE_FORM" | "REFERRAL" | "FACEBOOK" | "INSTAGRAM" | "OTHER";

export interface ProfileRecord {
  id: string;
  full_name: string;
  role: UserRole;
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
};

export const INQUIRY_STATUS_ORDER: InquiryStatus[] = [
  "NEW", "CONTACTED", "OFFER_SENT", "WAITING", "WON", "LOST",
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
}

export interface AddonRecord {
  id: string;
  code: string;
  name: string;
  price: number;
  active: boolean;
  sort: number;
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
  package_id: string | null;
  addon_ids: string[];
  price: number | null;
  discount: number;
  deposit: number;
  is_invoice: boolean;
  source: string | null;
  status: ReservationStatus;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithRefs extends ReservationRecord {
  customer: { id: string; name: string } | null;
  tent: { id: string; name: string } | null;
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

export type EquipmentStatus = "AVAILABLE" | "SERVICE" | "DAMAGED";

export interface EquipmentRecord {
  id: string;
  code: string;
  name: string;
  category: string | null;
  quantity: number;
  tracking: string;
  unit_cost: number | null;
  status: EquipmentStatus;
  notes: string | null;
  active: boolean;
}
