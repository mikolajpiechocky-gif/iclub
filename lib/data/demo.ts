// =====================================================================
// Dane demonstracyjne dla warstwy danych (fallback w TRYBIE DEMO).
// Używane, gdy Supabase nie jest skonfigurowane. Po podłączeniu Supabase
// warstwa danych czyta prawdziwe rekordy i te dane nie są używane.
// =====================================================================
import type { CustomerRecord, InquiryWithCustomer } from "./types";

const now = "2026-07-14T10:00:00.000Z";

export const DEMO_CUSTOMERS: CustomerRecord[] = [
  { id: "demo-c1", type: "PRIVATE", name: "Julia Nowicka", phone: "600 100 200", email: "julia.nowicka@example.pl", city: "Poznań", address: "ul. Poznańska 14, Tarnowo Podgórne", tax_id: null, notes: "Poleci nas znajomym.", created_at: now, updated_at: now },
  { id: "demo-c2", type: "PRIVATE", name: "Ola Kamińska", phone: "601 222 333", email: "ola.k@example.pl", city: "Poznań", address: null, tax_id: null, notes: null, created_at: now, updated_at: now },
  { id: "demo-c3", type: "COMPANY", name: "Firma Volt sp. z o.o.", phone: "61 800 90 00", email: "biuro@volt.example.pl", city: "Swarzędz", address: "ul. Przemysłowa 3", tax_id: "7773334455", notes: "Impreza integracyjna, faktura.", created_at: now, updated_at: now },
  { id: "demo-c4", type: "PRIVATE", name: "Tomasz Zając", phone: "602 444 555", email: null, city: "Kórnik", address: null, tax_id: null, notes: null, created_at: now, updated_at: now },
];

export const DEMO_INQUIRIES: InquiryWithCustomer[] = [
  { id: "demo-i1", customer_id: "demo-c1", customer: { id: "demo-c1", name: "Julia Nowicka" }, event_type: "Osiemnastka", event_date: "2026-07-18", location: "Tarnowo Podgórne", guests: 45, tent_interest: "6×8 Blue", package_interest: "Premium", addons_note: "Karaoke, strefa VIP", source: "INSTAGRAM", status: "CONTACTED", notes: null, created_at: now, updated_at: now },
  { id: "demo-i2", customer_id: "demo-c2", customer: { id: "demo-c2", name: "Ola Kamińska" }, event_type: "Wieczór panieński", event_date: "2026-07-18", location: "Poznań, Grunwald", guests: 25, tent_interest: "5,4×5,4 Yellow", package_interest: "Podstawowy", addons_note: null, source: "OLX", status: "NEW", notes: null, created_at: now, updated_at: now },
  { id: "demo-i3", customer_id: "demo-c3", customer: { id: "demo-c3", name: "Firma Volt sp. z o.o." }, event_type: "Impreza firmowa", event_date: "2026-07-19", location: "Swarzędz", guests: 80, tent_interest: "6×8 Green", package_interest: "VIP", addons_note: "Nagłośnienie koncertowe", source: "WEBSITE_FORM", status: "OFFER_SENT", notes: "Czeka na akceptację zarządu.", created_at: now, updated_at: now },
  { id: "demo-i4", customer_id: "demo-c4", customer: { id: "demo-c4", name: "Tomasz Zając" }, event_type: "Wesele", event_date: "2026-07-25", location: "Kórnik", guests: 60, tent_interest: "6×8 Blue", package_interest: "VIP", addons_note: null, source: "REFERRAL", status: "WAITING", notes: null, created_at: now, updated_at: now },
];
