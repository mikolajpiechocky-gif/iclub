"use server";
// Server Actions modułu Rezerwacje (iClub). Walidacja + zapis; tworzenie
// rezerwacji automatycznie generuje zlecenie i etapy (warstwa danych).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createReservation, updateReservation, deleteReservation, setReservationConfirmed, setReservationStatus, getReservation, setInvoiceIssued, checkTentOverbooking, checkAddonOverbooking, checkHeatingAvailability, type ReservationInput, type AddonShortage, type HeatingAvailability } from "@/lib/data/reservations";
import { getJobByReservation, setJobStatus } from "@/lib/data/jobs";
import { createCustomer, setCustomerPhone } from "@/lib/data/customers";
import { markJobPlannedPaid, createPayment } from "@/lib/data/payments";
import { getCurrentProfile } from "@/lib/data/profiles";
import { syncReservationToCalendar, removeReservationFromCalendar } from "@/lib/data/calendar-sync";
import { sumSlots, type TentChoice } from "@/lib/domain/tents";
import type { DiscountType } from "@/lib/domain/order-pricing";
import { clientTransportPrice, tripClass } from "@/lib/domain/transport";
import { getSettings } from "@/lib/data/settings";
import { listJobAssignments, setAssignmentEarningsSnapshot } from "@/lib/data/assignments";
import { listTransportCalcs } from "@/lib/data/transport";
import { writeRealizationCosts, syncRentalLaborCost } from "@/lib/data/realization-close";
import { jobEarningsCtx, buildAssignmentEarnings } from "@/lib/data/job-earnings";
import { generateChecklistForJob } from "@/lib/data/checklist-gen";
import { sendPushToEmployees, sendPushToUsers } from "@/lib/integrations/push";
import { geocode, routeLeg } from "@/lib/integrations/google-maps";
import { isGoogleMapsConfigured } from "@/lib/integrations/google-maps/config";
import type { ReservationStatus, BusinessLine, PricingSnapshot } from "@/lib/data/types";

export interface ReservationFormValues {
  business_line: BusinessLine;
  customer_id: string;            // id z listy, "" = bez klienta, "__new__" = nowy wpisany z ręki
  new_customer_name: string;      // §klient nowy klient wpisany w formularzu rezerwacji
  new_customer_phone: string;
  self_pickup: boolean;           // §transport odbiór własny (klient odbiera sam — bez transportu)
  event_type: string;
  event_date: string;
  setup_date: string;
  teardown_date: string;
  location: string;
  guests: string;
  tent_main: string;
  tent_extra: string;
  overbooking_override: boolean;
  overbooking_reason: string;
  package_id: string;
  addon_ids: string[];
  addon_qty: Record<string, number>; // §12.2 ilość per dodatek
  rental_items: string;
  rental_days: string; // §wypożyczalnia liczba dób wynajmu
  delivery_time: string;
  payment_upfront: boolean;
  // §18 Rozliczenie pracownika (wypożyczalnia): godzinowe domyślnie; ryczałt per zlecenie nadpisuje.
  rental_hourly: boolean;
  rental_flat: string;
  price: string;
  // §13.4 Rabat: typ + wartość wprowadzona; discount_amount to wyliczona kwota (zł) z formularza.
  discount_type: DiscountType;
  discount_value: string;
  discount_amount: string;
  transport_price: string; // §13.3 cena transportu dla klienta
  deposit: string;
  event_start_time: string; // §9.1 godzina rozpoczęcia imprezy
  assembly_time: string;    // §9.3 ustalona godzina montażu (opcjonalnie)
  pricing_snapshot: string; // §11.2 kopia wyceny (JSON zbudowany w formularzu)
  is_invoice: boolean;
  heating: boolean; // §41 ogrzewanie (nagrzewnica HT-01)
  source: string;
  status: ReservationStatus;
  notes: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

const DEMO_MSG =
  "Tryb demo: aby zapisywać rezerwacje, skonfiguruj Supabase (patrz docs/SUPABASE_SETUP.md).";
const STATUSES: ReservationStatus[] = ["TEMPORARY", "CONFIRMED", "CANCELLED", "EXPIRED"];
const DEFAULT_HOLD_HOURS = 48; // rezerwacja tymczasowa domyślnie 48h

function num(s: string): string | undefined {
  return s.trim() ? s.trim() : undefined;
}

function validate(v: ReservationFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  if (!STATUSES.includes(v.status)) e.status = "Wybierz status.";
  for (const [k, label] of [["guests", "Liczba osób"], ["price", "Cena"], ["discount_value", "Rabat"], ["transport_price", "Transport"], ["deposit", "Zadatek"], ["rental_flat", "Ryczałt"]] as const) {
    const val = num(v[k]);
    if (val && isNaN(Number(val.replace(",", ".")))) e[k] = `${label} musi być liczbą.`;
  }
  // §13.6 Zadatek nie może przekroczyć wartości końcowej rezerwacji.
  const priceN = toNumber(v.price);
  const depositN = toNumber(v.deposit);
  if (priceN != null && depositN != null && depositN > priceN) e.deposit = "Zadatek nie może przekroczyć wartości rezerwacji.";
  // §18 Wypożyczalnia: gdy wyłączono rozliczenie godzinowe, ryczałt musi być podany i > 0 — inaczej
  // toNumber('') === null i zapis po cichu wraca do godzinowego (pracownik nic nie dostaje „do wypłaty").
  // Guard na linię, bo rental_hourly nie jest resetowany przy zmianie linii (bez guardu iClub dostałby fałszywy błąd).
  if (v.business_line === "EQUIPMENT_RENTAL" && !v.rental_hourly && !e.rental_flat && (toNumber(v.rental_flat) ?? 0) <= 0) {
    e.rental_flat = "Podaj ryczałt (> 0) lub włącz rozliczenie godzinowe.";
  }
  return e;
}

function toNumber(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return isNaN(n) ? null : n;
}

// §11.2 Snapshot wyceny budowany w formularzu i przekazany jako JSON.
function parseSnapshot(s: string): PricingSnapshot | null {
  const t = s.trim();
  if (!t) return null;
  try { return JSON.parse(t) as PricingSnapshot; } catch { return null; }
}

// §8: następny dzień po dacie "YYYY-MM-DD" (bez wpływu strefy czasowej).
function nextDayIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

function toInput(v: ReservationFormValues): ReservationInput {
  const clean = (s: string) => {
    const t = s.trim();
    return t ? t : null;
  };
  const isIclub = v.business_line !== "EQUIPMENT_RENTAL";
  const expires_at =
    v.status === "TEMPORARY"
      ? new Date(Date.now() + DEFAULT_HOLD_HOURS * 3600 * 1000).toISOString()
      : null;
  // §8 Domyślna logika dat: montaż = dzień imprezy, demontaż = następny dzień.
  // Pola pozostają rozdzielne w bazie; użytkownik może je nadpisać rozwijaną sekcją.
  const eventDate = clean(v.event_date);
  const setupDate = clean(v.setup_date) ?? eventDate;
  const teardownDate = clean(v.teardown_date) ?? (eventDate ? nextDayIso(eventDate) : null);
  return {
    business_line: v.business_line === "EQUIPMENT_RENTAL" ? "EQUIPMENT_RENTAL" : "ICLUB",
    customer_id: v.customer_id.trim() ? v.customer_id.trim() : null,
    event_type: clean(v.event_type),
    event_date: eventDate,
    setup_date: setupDate,
    teardown_date: teardownDate,
    location: clean(v.location),
    guests: toNumber(v.guests) ?? null,
    tent_id: null, // ustalane w warstwie danych z wybranego typu
    tent_id_2: null,
    tent_main: v.tent_main || null,
    tent_extra: v.tent_extra || null,
    overbooking_override: v.overbooking_override,
    overbooking_reason: v.overbooking_override ? clean(v.overbooking_reason) : null,
    package_id: v.package_id.trim() ? v.package_id.trim() : null,
    // iClub: dodatki; wypożyczalnia: wybrany sprzęt z magazynu (id + ilość) — w obu wypadkach
    // po to, by kwota liczyła się z pozycji × ilość.
    addon_ids: v.addon_ids,
    // §12.2 zapisz ilości tylko dla wybranych pozycji (≥ 1).
    addon_qty: Object.fromEntries(v.addon_ids.map((id) => [id, Math.max(1, Math.round(v.addon_qty?.[id] ?? 1))])),
    rental_items: clean(v.rental_items),
    rental_days: v.business_line === "EQUIPMENT_RENTAL" ? (toNumber(v.rental_days) ?? null) : null,
    delivery_time: clean(v.delivery_time),
    payment_upfront: v.payment_upfront,
    price: toNumber(v.price),
    discount: toNumber(v.discount_amount) ?? 0, // faktyczna kwota rabatu wyliczona w formularzu
    discount_type: v.discount_type === "PERCENT" ? "PERCENT" : "AMOUNT",
    discount_value: toNumber(v.discount_value),
    // §transport Odbiór własny → brak transportu (0). Inaczej cena transportu z formularza.
    self_pickup: v.self_pickup,
    transport_price: v.self_pickup ? 0 : toNumber(v.transport_price),
    // Wypożyczalnia nie pobiera zadatku.
    deposit: v.business_line === "EQUIPMENT_RENTAL" ? 0 : (toNumber(v.deposit) ?? 0),
    event_start_time: clean(v.event_start_time),
    assembly_time: clean(v.assembly_time),
    pricing_snapshot: parseSnapshot(v.pricing_snapshot),
    // §18 ryczałt wypożyczalni: tylko dla linii wypożyczalni i gdy odznaczono „godzinowe".
    rental_settlement_flat: !isIclub && !v.rental_hourly ? toNumber(v.rental_flat) : null,
    is_invoice: v.is_invoice,
    heating: isIclub ? v.heating : false, // ogrzewanie tylko dla iClub
    source: clean(v.source),
    status: v.status,
    expires_at,
    notes: clean(v.notes),
  };
}

export interface TentConflict {
  id: string;
  label: string;
}

export interface TentAvailability {
  exceeded: string[]; // przekroczone pule (pusta = OK)
  conflicts: TentConflict[];
}

// §10.3 Sprawdza overbooking pojemnościowy dla wybranych typów namiotów.
export async function checkTentAvailabilityAction(
  tentMain: string,
  tentExtra: string,
  startDate: string,
  endDate: string,
  excludeId?: string,
): Promise<TentAvailability> {
  if (!startDate || (!tentMain && !tentExtra)) return { exceeded: [], conflicts: [] };
  try {
    const mine = sumSlots([tentMain as TentChoice, tentExtra as TentChoice]);
    const { exceeded, conflicts } = await checkTentOverbooking(mine, startDate, endDate || startDate, excludeId);
    return {
      exceeded,
      conflicts: conflicts.map((c) => {
        const from = c.setup_date ?? c.event_date ?? "?";
        const to = c.teardown_date && c.teardown_date !== from ? `–${c.teardown_date}` : "";
        return { id: c.id, label: `${c.customer?.name ?? "bez klienta"} — ${c.event_type ?? "impreza"} (${from}${to})` };
      }),
    };
  } catch {
    return { exceeded: [], conflicts: [] };
  }
}

// Twardy blok overbookingu (§3/§10) — używany przy zapisie. Zwraca komunikat błędu
// albo null (można zapisać). Wyjątek Szefa wymaga zaznaczenia i powodu.
async function overbookingBlock(values: ReservationFormValues, excludeId?: string): Promise<string | null> {
  if (values.business_line !== "ICLUB") return null;
  const start = values.setup_date || values.event_date;
  if (!start) return null;
  // Okno zajętości = montaż → demontaż z tą samą domyślną logiką co zapis (§8).
  const end = values.teardown_date || (values.event_date ? nextDayIso(values.event_date) : start);
  const mine = sumSlots([values.tent_main as TentChoice, values.tent_extra as TentChoice]);
  // Namioty i dodatki sprawdzamy równolegle (niezależne zapytania).
  const [{ exceeded }, { shortages }] = await Promise.all([
    checkTentOverbooking(mine, start, end, excludeId),
    checkAddonOverbooking(values.addon_ids, values.addon_qty, values.package_id || null, start, end, excludeId),
  ]);
  const problems = [...exceeded, ...shortages.map((s) => `${s.name} (potrzeba ${s.requested}, wolne ${Math.max(0, s.stock - s.used)} z ${s.stock})`)];
  if (!problems.length) return null;
  if (!values.overbooking_override) {
    return `Brak dostępności na ten termin: ${problems.join("; ")}. Zaznacz „wyjątek szefa" i podaj powód, aby zapisać mimo to.`;
  }
  if (!values.overbooking_reason.trim()) return "Podaj powód wyjątku (decyzja szefa).";
  return null;
}

// §12.3/§11 Live-sprawdzenie dostępności dodatków i pozycji z pakietu (dla formularza).
export async function checkAddonAvailabilityAction(
  addonIds: string[],
  addonQty: Record<string, number>,
  packageId: string,
  startDate: string,
  endDate: string,
  excludeId?: string,
): Promise<AddonShortage[]> {
  if (!startDate || (!addonIds.length && !packageId)) return [];
  try {
    const { shortages } = await checkAddonOverbooking(addonIds, addonQty, packageId || null, startDate, endDate || startDate, excludeId);
    return shortages;
  } catch {
    return [];
  }
}

// §41 Dostępność nagrzewnicy HT-01 dla ogrzewania w danym terminie (tylko ostrzeżenie).
export async function checkHeatingAvailabilityAction(
  startDate: string,
  endDate: string,
  excludeId?: string,
): Promise<HeatingAvailability> {
  if (!startDate) return { total: 0, used: 0, free: 0, hasItem: false };
  try {
    return await checkHeatingAvailability(startDate, endDate || startDate, excludeId);
  } catch {
    return { total: 0, used: 0, free: 0, hasItem: false };
  }
}

export interface ReservationTransportResult {
  ok: boolean;
  km?: number;          // odległość w jedną stronę
  price?: number | null; // cena z widełek (null = > 400 km, wycena indywidualna)
  farTrip?: boolean;
  error?: string;
}

// §14.3 Transport rezerwacji z adresu: baza → lokalizacja → odległość w jedną stronę
// → cena z widełek + klasa trasy.
export async function computeReservationTransportAction(location: string): Promise<ReservationTransportResult> {
  if (!location.trim()) return { ok: false, error: "Podaj najpierw lokalizację rezerwacji." };
  if (!isGoogleMapsConfigured()) return { ok: false, error: "Podłącz klucz Google Maps (docs/INTEGRATIONS.md), aby liczyć transport." };
  const { base_address } = await getSettings();
  const [baseGeo, destGeo] = await Promise.all([geocode(base_address), geocode(location)]);
  if (!baseGeo || !destGeo) return { ok: false, error: "Nie udało się wyznaczyć trasy — sprawdź adres." };
  const leg = await routeLeg(baseGeo, destGeo);
  if (!leg) return { ok: false, error: "Nie udało się wyznaczyć trasy." };
  const km = Math.round(leg.km * 10) / 10;
  return { ok: true, km, price: clientTransportPrice(km), farTrip: tripClass(km) === "far" };
}

// §klient Nowy klient wpisany z ręki (customer_id="__new__") → utwórz go i podmień id.
// Istniejący klient z podanym telefonem → zaktualizuj jego numer (edycja telefonu z rezerwacji).
async function resolveNewCustomer(values: ReservationFormValues): Promise<ReservationFormValues> {
  if (values.customer_id === "__new__") {
    const name = values.new_customer_name.trim();
    if (!name) return { ...values, customer_id: "" }; // brak nazwy → traktuj jak „bez klienta"
    const { id } = await createCustomer({ type: "PRIVATE", name, phone: values.new_customer_phone.trim() || null });
    return { ...values, customer_id: id };
  }
  const existingId = values.customer_id.trim();
  if (existingId && values.new_customer_phone.trim()) {
    try { await setCustomerPhone(existingId, values.new_customer_phone.trim()); } catch { /* nie blokuje zapisu rezerwacji */ }
  }
  return values;
}

export async function createReservationAction(values: ReservationFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  const block = await overbookingBlock(values);
  if (block) return { ok: false, error: block };
  try {
    const resolved = await resolveNewCustomer(values);
    const { id } = await createReservation(toInput(resolved));
    // §checklista Checklista pakowania tworzy się OD RAZU dla OBU linii — rezerwacje są zakładane
    // jako potwierdzone, więc nie ma już „potwierdzenia", pod które podpięte było generowanie iClub.
    try { const job = await getJobByReservation(id); if (job) await generateChecklistForJob(job.id, { onlyIfEmpty: true }); } catch { /* nie blokuje zapisu */ }
    // Nowa rezerwacja z apki → wolno utworzyć wydarzenie w kalendarzu.
    try { await syncReservationToCalendar(id, { allowCreate: true }); } catch (e) { console.error("Kalendarz: sync rezerwacji nie powiódł się", e); }
    // Nowe zlecenie iClub „do zgarnięcia" → push do pracowników.
    if (values.business_line === "ICLUB") {
      await sendPushToEmployees({ title: "Nowe zlecenie do zgarnięcia", body: [values.event_type || "Realizacja iClub", values.event_date, values.location].filter(Boolean).join(" · "), url: "/me", tag: "claimable" }).catch(() => {});
    }
    revalidatePath("/reservations");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać rezerwacji." };
  }
}

// Usunięcie rezerwacji (nieodwracalne) — tylko Szef. Usuwa też powiązane zlecenie
// (kaskada) i wydarzenie kalendarza. Wymaga potwierdzenia w interfejsie.
export async function deleteReservationAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false, error: "Tylko szef może usuwać rezerwacje." };
  try {
    try { await removeReservationFromCalendar(id); } catch {}
    await deleteReservation(id);
    revalidatePath("/reservations");
    revalidatePath("/dashboard");
    revalidatePath("/calendar");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się usunąć rezerwacji." };
  }
}

// §rezerwacja Odwołanie rezerwacji przez klienta. Status → CANCELLED, zlecenie → CANCELLED.
// iClub: zadatek przepada i liczy się do przychodu (zapis jako opłacona płatność). Tylko szef.
export async function cancelReservationByClientAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false, error: "Tylko szef może odwołać rezerwację." };
  try {
    const reservation = await getReservation(id);
    if (!reservation) return { ok: false, error: "Nie znaleziono rezerwacji." };
    await setReservationStatus(id, "CANCELLED");
    const job = await getJobByReservation(id);
    if (job) await setJobStatus(job.id, "CANCELLED");
    const deposit = Number(reservation.deposit ?? 0) || 0;
    if (reservation.business_line === "ICLUB" && deposit > 0 && job) {
      // Zadatek przepada → przychód realizacji (opłacona płatność).
      await createPayment({ job_id: job.id, title: "Zadatek przepadł (odwołanie klienta)", method: "TRANSFER", amount: deposit, status: "PAID", note: null }).catch(() => {});
    }
    try { await removeReservationFromCalendar(id); } catch {}
    revalidatePath(`/reservations/${id}`);
    revalidatePath("/reservations");
    revalidatePath("/dashboard");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się odwołać rezerwacji." };
  }
}

export async function markReservationConfirmedAction(id: string, confirmed: boolean): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false, error: "Tylko szef zmienia potwierdzenie klienta." };
  try {
    await setReservationConfirmed(id, confirmed);
    // §II.3 Po potwierdzeniu realizacji checklista pakowania tworzy się automatycznie.
    if (confirmed) {
      try { const job = await getJobByReservation(id); if (job) await generateChecklistForJob(job.id, { onlyIfEmpty: true }); } catch { /* nie blokuje potwierdzenia */ }
    }
    revalidatePath(`/reservations/${id}`);
    revalidatePath("/dashboard");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać potwierdzenia." };
  }
}

// Zakończenie realizacji: zlecenie → DONE i rozliczenie salda „Do zapłaty"
// (zaplanowane/zgłoszone → zapłacone). Raporty przeliczają się na żywo. Tylko OWNER.
export async function markRealizationDoneAction(reservationId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false, error: "Tylko szef oznacza realizację jako zakończoną." };
  try {
    const job = await getJobByReservation(reservationId);
    if (!job) return { ok: false, error: "Brak powiązanego zlecenia." };
    // Zamrożenie rozliczeń: policz i zapisz snapshot zarobku każdego pracownika ZANIM
    // oznaczymy DONE (żeby liczba realizacji w miesiącu nie liczyła jeszcze tej realizacji).
    // Snapshot to zabezpieczenie historii — jego błąd nie blokuje zakończenia realizacji.
    try {
      const [settings, assignments, transportCalcs] = await Promise.all([
        getSettings(), listJobAssignments(job.id), listTransportCalcs(job.id),
      ]);
      const farTrip = transportCalcs.some((c) => (c.one_way_km ?? 0) > 100);
      const ctx = jobEarningsCtx(job, settings, farTrip);
      for (const a of assignments) {
        if (a.status !== "APPROVED") continue;
        // §II.12 premia od dosprzedaży trafia do prowadzącego (is_lead).
        const eb = await buildAssignmentEarnings(ctx, a.rate, a.profile_id, a.is_lead);
        // §M2 Zamrażamy snapshot ZAWSZE dla przypisanego — także przy braku stawki (placeholder 0 zł),
        // żeby późniejsze ustawienie stawki nie zmieniało wstecznie zamkniętej realizacji.
        await setAssignmentEarningsSnapshot(a.id, eb ?? { base: 0, baseLabel: "Brak stawki", ownerBonus: 0, total: 0, possibleBonuses: [] });
      }
    } catch (e) {
      console.error("Zamrożenie rozliczeń nie powiodło się:", e);
    }
    await setJobStatus(job.id, "DONE");
    await markJobPlannedPaid(job.id);
    // §II.17 Zapisz wynagrodzenia + paliwo jako koszty realizacji (do Raportów/Finansów).
    await writeRealizationCosts(job.id).catch(() => {});
    revalidatePath(`/reservations/${reservationId}`);
    revalidatePath("/reports");
    revalidatePath("/payments");
    revalidatePath("/dashboard");
    return { ok: true, id: reservationId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zakończyć realizacji." };
  }
}

export async function markInvoiceIssuedAction(id: string, issued: boolean, invoiceNumber: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false, error: "Tylko szef zmienia status faktury." };
  try {
    await setInvoiceIssued(id, issued, invoiceNumber.trim() || null);
    revalidatePath(`/reservations/${id}`);
    revalidatePath("/dashboard");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać faktury." };
  }
}

export async function updateReservationAction(id: string, values: ReservationFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  const block = await overbookingBlock(values, id);
  if (block) return { ok: false, error: block };
  try {
    const resolved = await resolveNewCustomer(values);
    await updateReservation(id, toInput(resolved));
    // §kalendarz Zapis edycji aktualizuje istniejące wydarzenie, a gdy go brak — dotwarza je
    // (backfill aktywnych rezerwacji; przeszłych nie dotwarzamy).
    // §BEZPIECZEŃSTWO Edycja tylko AKTUALIZUJE istniejący wpis apki (allowCreate:false) — nie tworzy
    // nowego, żeby nie dublować wydarzeń dodanych ręcznie w kalendarzu (bez powiązania z apką).
    try { await syncReservationToCalendar(id, { allowCreate: false }); } catch (e) { console.error("Kalendarz: sync przy edycji nie powiódł się", e); }
    // §18 Wypożyczalnia: ryczałt zmieniony po domknięciu → zsynchronizuj koszt „Robocizna" z wypłatą
    // (saldo pracownika czyta ryczałt na żywo). Self-guarded: no-op poza EQUIPMENT_RENTAL + DONE.
    try { const job = await getJobByReservation(id); if (job) await syncRentalLaborCost(job.id); } catch (e) { console.error("Sync kosztu robocizny wypożyczalni nie powiódł się", e); }
    // Zmiana szczegółów → push do przypisanych (APPROVED) pracowników.
    try {
      const job = await getJobByReservation(id);
      if (job) {
        // §wypożyczalnia Odśwież checklistę pakowania z aktualnych itemów (jeśli jeszcze pusta — nie kasuje odhaczonej).
        if (values.business_line === "EQUIPMENT_RENTAL") await generateChecklistForJob(job.id, { onlyIfEmpty: true }).catch(() => {});
        const assigned = (await listJobAssignments(job.id)).filter((a) => a.status === "APPROVED").map((a) => a.profile_id);
        if (assigned.length) await sendPushToUsers(assigned, { title: "Zmiana szczegółów realizacji", body: [values.event_type, values.event_date, values.location].filter(Boolean).join(" · "), url: `/field/${job.id}`, tag: `job-${job.id}` });
      }
    } catch { /* push opcjonalny */ }
    revalidatePath("/reservations");
    revalidatePath(`/reservations/${id}`);
    revalidatePath(`/reservations/${id}/edit`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać zmian." };
  }
}
