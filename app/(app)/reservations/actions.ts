"use server";
// Server Actions modułu Rezerwacje (iClub). Walidacja + zapis; tworzenie
// rezerwacji automatycznie generuje zlecenie i etapy (warstwa danych).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createReservation, updateReservation, setReservationConfirmed, setInvoiceIssued, checkTentOverbooking, type ReservationInput } from "@/lib/data/reservations";
import { getJobByReservation, setJobStatus } from "@/lib/data/jobs";
import { markJobPlannedPaid } from "@/lib/data/payments";
import { getCurrentProfile } from "@/lib/data/profiles";
import { syncReservationToCalendar } from "@/lib/data/calendar-sync";
import { sumSlots, type TentChoice } from "@/lib/domain/tents";
import type { ReservationStatus, BusinessLine } from "@/lib/data/types";

export interface ReservationFormValues {
  business_line: BusinessLine;
  customer_id: string;
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
  rental_items: string;
  delivery_time: string;
  payment_upfront: boolean;
  price: string;
  discount: string;
  deposit: string;
  is_invoice: boolean;
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
  for (const [k, label] of [["guests", "Liczba osób"], ["price", "Cena"], ["discount", "Rabat"], ["deposit", "Zadatek"]] as const) {
    const val = num(v[k]);
    if (val && isNaN(Number(val.replace(",", ".")))) e[k] = `${label} musi być liczbą.`;
  }
  return e;
}

function toNumber(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return isNaN(n) ? null : n;
}

function toInput(v: ReservationFormValues): ReservationInput {
  const clean = (s: string) => {
    const t = s.trim();
    return t ? t : null;
  };
  const expires_at =
    v.status === "TEMPORARY"
      ? new Date(Date.now() + DEFAULT_HOLD_HOURS * 3600 * 1000).toISOString()
      : null;
  return {
    business_line: v.business_line === "EQUIPMENT_RENTAL" ? "EQUIPMENT_RENTAL" : "ICLUB",
    customer_id: v.customer_id.trim() ? v.customer_id.trim() : null,
    event_type: clean(v.event_type),
    event_date: clean(v.event_date),
    setup_date: clean(v.setup_date),
    teardown_date: clean(v.teardown_date),
    location: clean(v.location),
    guests: toNumber(v.guests) ?? null,
    tent_id: null, // ustalane w warstwie danych z wybranego typu
    tent_id_2: null,
    tent_main: v.tent_main || null,
    tent_extra: v.tent_extra || null,
    overbooking_override: v.overbooking_override,
    overbooking_reason: v.overbooking_override ? clean(v.overbooking_reason) : null,
    package_id: v.package_id.trim() ? v.package_id.trim() : null,
    addon_ids: v.addon_ids,
    rental_items: clean(v.rental_items),
    delivery_time: clean(v.delivery_time),
    payment_upfront: v.payment_upfront,
    price: toNumber(v.price),
    discount: toNumber(v.discount) ?? 0,
    deposit: toNumber(v.deposit) ?? 0,
    is_invoice: v.is_invoice,
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
  const end = values.teardown_date || values.event_date || start;
  const mine = sumSlots([values.tent_main as TentChoice, values.tent_extra as TentChoice]);
  const { exceeded } = await checkTentOverbooking(mine, start, end, excludeId);
  if (!exceeded.length) return null;
  if (!values.overbooking_override) {
    return `Overbooking: brak wolnych zasobów (${exceeded.join(", ")}) na ten termin. Zaznacz „wyjątek szefa" i podaj powód, aby zapisać mimo to.`;
  }
  if (!values.overbooking_reason.trim()) return "Podaj powód wyjątku overbookingu (decyzja szefa).";
  return null;
}

export async function createReservationAction(values: ReservationFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  const block = await overbookingBlock(values);
  if (block) return { ok: false, error: block };
  try {
    const { id } = await createReservation(toInput(values));
    // Nowa rezerwacja z apki → wolno utworzyć wydarzenie w kalendarzu.
    try { await syncReservationToCalendar(id, { allowCreate: true }); } catch {}
    revalidatePath("/reservations");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać rezerwacji." };
  }
}

export async function markReservationConfirmedAction(id: string, confirmed: boolean): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false, error: "Tylko szef zmienia potwierdzenie klienta." };
  try {
    await setReservationConfirmed(id, confirmed);
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
    await setJobStatus(job.id, "DONE");
    await markJobPlannedPaid(job.id);
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
    await updateReservation(id, toInput(values));
    try { await syncReservationToCalendar(id); } catch {}
    revalidatePath("/reservations");
    revalidatePath(`/reservations/${id}/edit`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać zmian." };
  }
}
