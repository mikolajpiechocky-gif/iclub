// Dane demonstracyjne dla zasobów i rezerwacji (fallback w TRYBIE DEMO).
import type { TentRecord, PackageRecord, AddonRecord, ReservationWithRefs } from "./types";

export const DEMO_TENT_RECORDS: TentRecord[] = [
  { id: "demo-t1", code: "TENT-01", name: "Namiot 6×8 Niebieski", size: "6×8", set_color: "Niebieski", has_back_door: true, status: "AVAILABLE", notes: null },
  { id: "demo-t2", code: "TENT-02", name: "Namiot 6×8 Żółty", size: "6×8", set_color: "Żółty", has_back_door: false, status: "AVAILABLE", notes: null },
  { id: "demo-t3", code: "TENT-03", name: "Namiot 5,4×5,4 Żółty", size: "5,4×5,4", set_color: "Żółty", has_back_door: false, status: "AVAILABLE", notes: null },
];

export const DEMO_PACKAGE_RECORDS: PackageRecord[] = [
  { id: "demo-p1", code: "STANDARD", name: "Standard", description: "Namiot iClub, montaż, oświetlenie LED, laser, dym, serwis, nagłośnienie.", base_price: 0, active: true, sort: 1 },
  { id: "demo-p2", code: "PREMIUM", name: "Premium", description: "Standard + parkiet ze sztucznej trawy, laser animacyjny, 50 pałeczek fluo.", base_price: 0, active: true, sort: 2 },
  { id: "demo-p3", code: "VIP", name: "VIP", description: "Premium + 100 pałeczek fluo, oświetlenie UV, strefa VIP, karaoke.", base_price: 0, active: true, sort: 3 },
];

export const DEMO_ADDON_RECORDS: AddonRecord[] = [
  { id: "demo-a1", code: "KARAOKE", name: "Mikrofony karaoke", price: 100, active: true, sort: 1 },
  { id: "demo-a2", code: "VIP_ZONE", name: "Strefa VIP", price: 200, active: true, sort: 2 },
  { id: "demo-a3", code: "HEATING", name: "Ogrzewanie", price: 250, active: true, sort: 3 },
  { id: "demo-a4", code: "TABLES", name: "Stoły", price: 0, active: true, sort: 4 },
  { id: "demo-a5", code: "CHAIRS", name: "Krzesła", price: 0, active: true, sort: 5 },
  { id: "demo-a6", code: "COCKTAIL", name: "Stoliki koktajlowe", price: 0, active: true, sort: 6 },
];

const now = "2026-07-14T10:00:00.000Z";

export const DEMO_RESERVATIONS: ReservationWithRefs[] = [
  {
    id: "demo-r1", business_line: "ICLUB",
    customer_id: "demo-c1", customer: { id: "demo-c1", name: "Julia Nowicka" },
    inquiry_id: "demo-i1",
    event_type: "Osiemnastka", event_date: "2026-07-18", setup_date: "2026-07-18", teardown_date: "2026-07-19",
    location: "Tarnowo Podgórne, ul. Poznańska 14", guests: 45,
    tent_id: "demo-t1", tent_id_2: null, tent: { id: "demo-t1", name: "Namiot 6×8 Niebieski" },
    package_id: "demo-p2", package: { id: "demo-p2", name: "Premium" },
    addon_ids: ["demo-a1", "demo-a2"], rental_items: null, delivery_time: null, payment_upfront: false,
    price: 6800, discount: 0, deposit: 2000,
    is_invoice: false, source: "INSTAGRAM", status: "CONFIRMED", expires_at: null,
    notes: null, client_confirmed: true, client_confirmed_at: now,
    invoice_issued: false, invoice_issued_at: null, invoice_number: null, created_at: now, updated_at: now,
  },
  {
    id: "demo-r2", business_line: "ICLUB",
    customer_id: "demo-c4", customer: { id: "demo-c4", name: "Tomasz Zając" },
    inquiry_id: null,
    event_type: "Wesele", event_date: "2026-07-25", setup_date: "2026-07-25", teardown_date: "2026-07-26",
    location: "Kórnik", guests: 60,
    tent_id: "demo-t1", tent_id_2: null, tent: { id: "demo-t1", name: "Namiot 6×8 Niebieski" },
    package_id: "demo-p3", package: { id: "demo-p3", name: "VIP" },
    addon_ids: ["demo-a2", "demo-a3"], rental_items: null, delivery_time: null, payment_upfront: false,
    price: null, discount: 0, deposit: 0,
    is_invoice: false, source: "REFERRAL", status: "TEMPORARY", expires_at: "2026-07-20T10:00:00.000Z",
    notes: "Brak zadatku — rezerwacja tymczasowa.", client_confirmed: false, client_confirmed_at: null,
    invoice_issued: false, invoice_issued_at: null, invoice_number: null, created_at: now, updated_at: now,
  },
].map((r) => ({ tent_main: null, tent_extra: null, overbooking_override: false, overbooking_reason: null, ...r })) as unknown as ReservationWithRefs[];
