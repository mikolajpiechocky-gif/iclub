"use server";
// Server Actions modułu Rezerwacje (iClub). Walidacja + zapis; tworzenie
// rezerwacji automatycznie generuje zlecenie i etapy (warstwa danych).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createReservation, updateReservation, setReservationConfirmed, setInvoiceIssued, findTentConflicts, type ReservationInput } from "@/lib/data/reservations";
import { syncReservationToCalendar } from "@/lib/data/calendar-sync";
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
  tent_id: string;
  package_id: string;
  addon_ids: string[];
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
  for (const [k, label] of [["guests", "Liczba osób"], ["price", "Cena"], ["discount", "Rabat"], ["deposit", "Zaliczka"]] as const) {
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
    tent_id: v.tent_id.trim() ? v.tent_id.trim() : null,
    package_id: v.package_id.trim() ? v.package_id.trim() : null,
    addon_ids: v.addon_ids,
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

// Sprawdza dostępność namiotu w oknie montaż→demontaż (§8). Ostrzeżenie,
// nie blokada — właściciel może świadomie zapisać mimo konfliktu.
export async function checkTentAvailabilityAction(
  tentId: string,
  startDate: string,
  endDate: string,
  excludeId?: string
): Promise<TentConflict[]> {
  if (!tentId || !startDate) return [];
  try {
    const conflicts = await findTentConflicts(tentId, startDate, endDate || startDate, excludeId);
    return conflicts.map((c) => {
      const from = c.setup_date ?? c.event_date ?? "?";
      const to = c.teardown_date && c.teardown_date !== from ? `–${c.teardown_date}` : "";
      return {
        id: c.id,
        label: `${c.customer?.name ?? "bez klienta"} — ${c.event_type ?? "impreza"} (${from}${to})`,
      };
    });
  } catch {
    return [];
  }
}

export async function createReservationAction(values: ReservationFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  try {
    const { id } = await createReservation(toInput(values));
    try { await syncReservationToCalendar(id); } catch {}
    revalidatePath("/reservations");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać rezerwacji." };
  }
}

export async function markReservationConfirmedAction(id: string, confirmed: boolean): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  try {
    await setReservationConfirmed(id, confirmed);
    revalidatePath(`/reservations/${id}`);
    revalidatePath("/dashboard");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać potwierdzenia." };
  }
}

export async function markInvoiceIssuedAction(id: string, issued: boolean, invoiceNumber: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
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
