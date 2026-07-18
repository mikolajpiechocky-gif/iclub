// =====================================================================
// iClub Management — lokalne dane demonstracyjne (PL, realistyczne).
// To NIE jest trwały zapis. Wszystkie mutacje w UI trzymaj w useState.
// TODO(backend): zastąpić zapytaniami do Supabase.
// =====================================================================

import type {
  Inquiry, Job, Tent, GearItem, ChecklistItemData,
  CostData, PaymentData, DamageData, StatusKey,
} from "./types";

// Mapa etykiet statusów (nazwa + kolor). Kolor = zmienna CSS.
export const STATUS_META: Record<StatusKey, { label: string; fg: string; bg: string }> = {
  planned:    { label: "Zaplanowane",     fg: "#7fa8f5", bg: "#182238" },
  inprogress: { label: "W realizacji",    fg: "#b98cf5", bg: "#271b3f" },
  loading:    { label: "Załadunek",       fg: "#ebb05a", bg: "#332814" },
  done:       { label: "Zakończone",      fg: "#5fd68b", bg: "#16301f" },
  conflict:   { label: "Konflikt",        fg: "#f58585", bg: "#341a1d" },
  available:  { label: "Dostępny",        fg: "#5fd68b", bg: "#16301f" },
  onsite:     { label: "Na realizacji",   fg: "#b98cf5", bg: "#271b3f" },
  damaged:    { label: "Uszkodzony",      fg: "#f58585", bg: "#341a1d" },
  service:    { label: "W serwisie",      fg: "#ebb05a", bg: "#332814" },
  paid:       { label: "Zapłacone",       fg: "#5fd68b", bg: "#16301f" },
  reported:   { label: "Zgłoszono odbiór",fg: "#ebb05a", bg: "#332814" },
  pending:    { label: "Oczekuje",        fg: "#9aa0b2", bg: "#22242e" },
  cancelled:  { label: "Anulowane",       fg: "#9aa0b2", bg: "#22242e" },
};

export const CURRENT_USER = { name: "Mikołaj", role: "OWNER" as const };
export const CURRENT_EMPLOYEE = { name: "Marek", initials: "MW" };

export const formatPLN = (v: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

// --- Zlecenie demonstracyjne: osiemnastka pod Poznaniem ---
export const DEMO_JOB: Job = {
  id: "1042",
  title: "Osiemnastka — Julia N.",
  status: "inprogress",
  eventType: "Osiemnastka",
  guests: 45,
  dateRange: "18–19 lipca 2026",
  customer: {
    id: "c1",
    name: "Julia Nowicka",
    phone: "600 100 200",
    email: "julia.nowicka@example.pl",
    city: "Poznań",
  },
  address: "Tarnowo Podgórne, ul. Poznańska 14",
  route: "24 km · 32 min",
  tent: "6×8 Blue",
  packageName: "Pakiet Premium",
  addons: ["Ciężki dym", "Karaoke", "Strefa VIP"],
  crew: ["Marek W.", "Kuba L."],
  vehicle: "Iveco Daily",
  value: 6800,
  deposit: 2000,
  schedule: [
    { time: "12:30", date: "18 lip", title: "Transport", desc: "Wyjazd z magazynu · Iveco Daily", key: "transport" },
    { time: "13:30", date: "18 lip", title: "Montaż", desc: "Namiot, nagłośnienie, światła", key: "montaz" },
    { time: "14:00", date: "18 lip", title: "Początek wydarzenia", desc: "Odbiór przez klienta, podpis", key: "start" },
    { time: "02:00", date: "19 lip", title: "Koniec wydarzenia", desc: "Zakończenie imprezy", key: "koniec" },
    { time: "10:00", date: "19 lip", title: "Demontaż", desc: "Spakowanie sprzętu", key: "demontaz" },
    { time: "12:00", date: "19 lip", title: "Powrót", desc: "Zwrot do magazynu Poznań", key: "powrot" },
  ],
};

export const DEMO_UPCOMING: Array<{ id: string; day: string; time: string; client: string; place: string; tent: string; team: string; status: StatusKey }> = [
  { id: "1042", day: "Dziś 18",  time: "14:00", client: "Osiemnastka — Julia N.", place: "Tarnowo Podg.",  tent: "6×8 Blue",     team: "Marek, Kuba", status: "inprogress" },
  { id: "1045", day: "Dziś 18",  time: "16:30", client: "Wieczór panieński — Ola K.", place: "Poznań, Grunwald", tent: "5,4×5,4 Yellow", team: "Ola", status: "planned" },
  { id: "1047", day: "Jutro 19", time: "12:00", client: "Impreza firmowa — Volt", place: "Swarzędz", tent: "6×8 Green", team: "Piotr, Adam", status: "planned" },
  { id: "1051", day: "Sob 25",   time: "15:00", client: "Wesele — Zającowie", place: "Kórnik", tent: "6×8 Blue", team: "Marek, Ola", status: "planned" },
];

export const DEMO_KPIS = [
  { label: "Najbliższe (7 dni)", value: "6", sub: "2 w ten weekend", tone: "neutral" as const },
  { label: "Nowe zapytania", value: "5", sub: "3 dziś", tone: "neutral" as const },
  { label: "Rezerwacje bez zadatku", value: "2", sub: "wymaga uwagi", tone: "warn" as const },
  { label: "Konflikty sprzętu", value: "1", sub: "6×8 Blue", tone: "bad" as const },
  { label: "Zaległe płatności", value: formatPLN(4890), sub: "4 faktury", tone: "bad" as const },
  { label: "Koszty do weryfikacji", value: "3", sub: "240 zł paliwo", tone: "warn" as const },
];

export const DEMO_ATTENTION = [
  { tone: "bad" as const, title: "Konflikt sprzętu: 6×8 Blue", desc: "Zlecenia #1042 i #1047 nakładają się 18–19 lip", cta: "Rozwiąż" },
  { tone: "warn" as const, title: "Rezerwacja bez zadatku", desc: "#1051 — Wieczór panieński, termin za 6 dni", cta: "Ponaglij" },
  { tone: "bad" as const, title: "Zaległa płatność 1 800 zł", desc: "#1038 — Nowak, 9 dni po terminie", cta: "Zobacz" },
  { tone: "warn" as const, title: "Koszt do weryfikacji", desc: "Paliwo 240 zł — zgłosił Marek W.", cta: "Zatwierdź" },
  { tone: "bad" as const, title: "Szkoda: rozdarcie poszycia", desc: "6×8 Green — pilność wysoka", cta: "Zobacz" },
];

export const DEMO_CREW = [
  { initials: "MW", name: "Marek W.", job: "Osiemnastka Julia N.", since: "12:30" },
  { initials: "KL", name: "Kuba L.", job: "Osiemnastka Julia N.", since: "12:30" },
  { initials: "PZ", name: "Piotr Z.", job: "Impreza Volt", since: "15:00" },
];

export const DEMO_INQUIRIES: Inquiry[] = [
  { id: "Z-201", customer: "Julia Nowicka", source: "Instagram", eventDate: "2026-07-18", city: "Poznań", guests: 45, interest: "6×8 Blue + Premium", status: "inprogress", owner: "Mikołaj", lastContact: "2026-07-14" },
  { id: "Z-202", customer: "Ola Kamińska", source: "OLX", eventDate: "2026-07-18", city: "Grunwald", guests: 25, interest: "5,4×5,4 Yellow", status: "planned", owner: "Mikołaj", lastContact: "2026-07-15" },
  { id: "Z-203", customer: "Firma Volt sp. z o.o.", source: "Formularz strony", eventDate: "2026-07-19", city: "Swarzędz", guests: 80, interest: "6×8 Green + nagłośnienie", status: "pending", owner: "Mikołaj", lastContact: "2026-07-12" },
  { id: "Z-204", customer: "Tomasz Zając", source: "Polecenie", eventDate: "2026-07-25", city: "Kórnik", guests: 60, interest: "6×8 Blue + VIP", status: "planned", owner: "Mikołaj", lastContact: "2026-07-16" },
  { id: "Z-205", customer: "Karolina Wrona", source: "Facebook Marketplace", eventDate: "2026-08-02", city: "Luboń", guests: 30, interest: "Stoły + krzesła", status: "pending", owner: "Mikołaj", lastContact: "2026-07-11" },
  { id: "Z-206", customer: "Paweł Górski", source: "Telefon", eventDate: "2026-08-09", city: "Mosina", guests: 40, interest: "6×8 Blue", status: "cancelled", owner: "Mikołaj", lastContact: "2026-07-08" },
];

export const DEMO_TENTS: Tent[] = [
  { id: "TENT-01", name: "Namiot 6×8 Blue", code: "TENT-01", status: "onsite", location: "Osiemnastka Julia N. · do 19 lip" },
  { id: "TENT-02", name: "Namiot 6×8 Green", code: "TENT-02", status: "service", location: "Szkoda: poszycie · serwis" },
  { id: "TENT-03", name: "Namiot 5,4×5,4 Yellow", code: "TENT-03", status: "available", location: "Magazyn Poznań · gotowy" },
];

export const DEMO_GEAR: GearItem[] = [
  { id: "g1", name: "Kolumny aktywne", total: 8, available: 5, reserved: 2, damaged: 1, tracking: "quantity" },
  { id: "g2", name: "Głowice LED", total: 12, available: 9, reserved: 3, damaged: 0, tracking: "quantity" },
  { id: "g3", name: "Wytwornice dymu", total: 4, available: 3, reserved: 0, damaged: 1, tracking: "quantity" },
  { id: "g4", name: "Stoły koktajlowe", total: 20, available: 12, reserved: 8, damaged: 0, tracking: "quantity" },
  { id: "g5", name: "Krzesła", total: 120, available: 80, reserved: 40, damaged: 0, tracking: "quantity" },
  { id: "g6", name: "Parasole grzewcze", total: 6, available: 4, reserved: 2, damaged: 0, tracking: "quantity" },
];

export const DEMO_INVENTORY_SUMMARY = [
  { label: "Dostępne", value: 182, color: "#5fd68b" },
  { label: "Zarezerw.", value: 55, color: "#7fa8f5" },
  { label: "Na realizacji", value: 21, color: "#b98cf5" },
  { label: "Uszkodzone", value: 3, color: "#f58585" },
  { label: "W serwisie", value: 2, color: "#ebb05a" },
  { label: "Braki", value: 1, color: "#f58585" },
];

export const DEMO_CHECKLIST: ChecklistItemData[] = [
  { id: "c1", label: "Namiot 6×8 Blue — poszycie", category: "Magazyn", qty: "1 szt.", required: true, done: true },
  { id: "c2", label: "Dmuchawa + wąż", category: "Magazyn", qty: "1 szt.", required: true, done: true },
  { id: "c3", label: "Kotwy i obciążniki", category: "Magazyn", qty: "8 szt.", required: true, done: false },
  { id: "c4", label: "Kolumny aktywne", category: "Załadunek", qty: "2 szt.", required: false, done: true },
  { id: "c5", label: "Głowice LED + statyw", category: "Załadunek", qty: "4 szt.", required: false, done: false },
  { id: "c6", label: "Zabezpieczenie w transporcie", category: "Załadunek", required: true, done: false },
  { id: "c7", label: "Kable i zasilanie", category: "Sprzęt dodatkowy", required: false, done: true, problem: true },
  { id: "c8", label: "Wytwornica dymu + płyn", category: "Sprzęt dodatkowy", qty: "1 szt.", required: false, done: false },
  { id: "c9", label: "Zestaw VIP (dywan, słupki)", category: "Dodatki", qty: "1 kpl.", required: false, done: false },
  { id: "c10", label: "Karaoke + mikrofony", category: "Dodatki", qty: "2 szt.", required: false, done: false },
  { id: "c11", label: "Umowa i dokumenty", category: "Dokumenty", required: true, done: false },
];

export const CHECKLIST_CATEGORIES = ["Magazyn", "Załadunek", "Sprzęt dodatkowy", "Dodatki", "Dokumenty"];

export const DEMO_PAYMENTS: PaymentData[] = [
  { id: "p1", title: "Zadatek", method: "Przelew", amount: 2000, meta: "Przelew · 05 lip 2026", status: "paid" },
  { id: "p2", title: "Dopłata na miejscu", method: "Gotówka", amount: 4800, meta: "Gotówka · zgłosił Marek W.", status: "reported" },
  { id: "p3", title: "Kaucja zwrotna", method: "BLIK", amount: 500, meta: "BLIK · po demontażu", status: "pending" },
  { id: "p4", title: "Faktura #1038 — Nowak", method: "Przelew", amount: 1800, meta: "9 dni po terminie", status: "conflict" },
];

export const COST_CATEGORIES = ["Paliwo", "Pałeczki fluorescencyjne", "Szampan", "Pracownik", "Autostrada", "Hotel", "Dieta", "Inne"];

export const DEMO_COSTS: CostData[] = [
  { id: "k1", amount: 240, category: "Paliwo", jobId: "1042", employee: "Marek W.", date: "2026-07-18", note: "Tankowanie Orlen", status: "pending" },
  { id: "k2", amount: 45, category: "Autostrada", jobId: "1042", employee: "Marek W.", date: "2026-07-18", status: "done" },
  { id: "k3", amount: 120, category: "Szampan", jobId: "1045", employee: "Ola G.", date: "2026-07-18", status: "pending" },
];

export const DEMO_DAMAGE: DamageData = {
  id: "d1",
  gear: "Namiot 6×8 Green — poszycie",
  description: "Rozdarcie ~15 cm przy wejściu, prawdopodobnie od wiatru.",
  urgency: "Wysoka",
  jobId: "1042",
  savedOffline: true,
};

// Kalendarz — lipiec 2026 (1 lip = środa).
export const DEMO_CALENDAR: Record<number, Array<{ label: string; kind: "done" | "planned" | "inprogress" | "conflict" | "rent" | "temp" | "cancel" }>> = {
  4:  [{ label: "Wesele Nowak", kind: "done" }],
  8:  [{ label: "Firmowa Volt", kind: "planned" }],
  9:  [{ label: "Firmowa Volt", kind: "planned" }],
  11: [{ label: "Panieński", kind: "inprogress" }],
  12: [{ label: "Konflikt 6×8", kind: "conflict" }, { label: "Wynajem kolumn", kind: "rent" }],
  15: [{ label: "18-stka Julii", kind: "planned" }],
  18: [{ label: "Osiemnastka Julia", kind: "inprogress" }, { label: "Panieński Ola", kind: "planned" }],
  22: [{ label: "Rezerw. tymcz.", kind: "temp" }, { label: "Wesele Zając", kind: "planned" }],
  25: [{ label: "Wesele Zając", kind: "planned" }],
  28: [{ label: "Anulowane", kind: "cancel" }],
};

export const CALENDAR_KIND_COLORS: Record<string, { bg: string; fg: string; br: string }> = {
  done:       { bg: "#16301f", fg: "#5fd68b", br: "#22c55e" },
  planned:    { bg: "#182238", fg: "#7fa8f5", br: "#3b82f6" },
  inprogress: { bg: "#2a1533", fg: "#e779c7", br: "#e11d74" },
  conflict:   { bg: "#341a1d", fg: "#f58585", br: "#ef4444" },
  rent:       { bg: "#0e2e31", fg: "#4fd3de", br: "#14b8c4" },
  temp:       { bg: "#1a1c24", fg: "#9096a8", br: "#3a3d4a" },
  cancel:     { bg: "#1a1c24", fg: "#6b7180", br: "#3a3d4a" },
};
