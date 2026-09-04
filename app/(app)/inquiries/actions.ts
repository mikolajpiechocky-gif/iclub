"use server";
// Server Actions modułu Zapytania: walidacja + zapis przez warstwę danych.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createInquiry, updateInquiry, deleteInquiry, reactivateInquiry, setInquiryAutoCloseBlocked, setInquiryStatus, autoCloseStaleLeads, type InquiryInput } from "@/lib/data/inquiries";
import { createEsignFromInquiry, sendEsignContract, type EsignFieldOverrides } from "@/lib/data/esign";
import { getCurrentProfile } from "@/lib/data/profiles";
import type { InquiryStatus, InquirySource } from "@/lib/data/types";

export interface InquiryFormValues {
  customer_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  event_type: string;
  event_date: string;
  location: string;
  guests: string;
  tent_interest: string;
  package_interest: string;
  addons_note: string;
  source: string;
  status: InquiryStatus;
  notes: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

const DEMO_MSG =
  "Tryb demo: aby zapisywać zapytania, skonfiguruj Supabase (patrz docs/SUPABASE_SETUP.md).";

const STATUSES: InquiryStatus[] = ["NEW", "CONTACTED", "OFFER_SENT", "WAITING", "WON", "LOST", "REHEATED"];

function validate(v: InquiryFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  if (!STATUSES.includes(v.status)) e.status = "Wybierz status.";
  if (v.guests.trim() && !/^\d+$/.test(v.guests.trim())) {
    e.guests = "Liczba osób musi być liczbą.";
  }
  return e;
}

function toInput(v: InquiryFormValues): InquiryInput {
  const clean = (s: string) => {
    const t = s.trim();
    return t ? t : null;
  };
  return {
    customer_id: v.customer_id.trim() ? v.customer_id.trim() : null,
    contact_name: clean(v.contact_name),
    contact_phone: clean(v.contact_phone),
    contact_email: clean(v.contact_email),
    event_type: clean(v.event_type),
    event_date: clean(v.event_date),
    location: clean(v.location),
    guests: v.guests.trim() ? Number(v.guests.trim()) : null,
    tent_interest: clean(v.tent_interest),
    package_interest: clean(v.package_interest),
    addons_note: clean(v.addons_note),
    source: (clean(v.source) as InquirySource | null) ?? null,
    status: v.status,
    notes: clean(v.notes),
  };
}

export async function createInquiryAction(values: InquiryFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  try {
    const { id } = await createInquiry(toInput(values));
    revalidatePath("/inquiries");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać zapytania." };
  }
}

export async function updateInquiryAction(id: string, values: InquiryFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  try {
    await updateInquiry(id, toInput(values));
    revalidatePath("/inquiries");
    revalidatePath(`/inquiries/${id}/edit`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać zmian." };
  }
}

// §6.3 Odgrzanie leada (przywrócenie do obsługi, z zachowaniem historii).
export async function reactivateInquiryAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  try {
    await reactivateInquiry(id);
    revalidatePath("/inquiries");
    revalidatePath(`/inquiries/${id}/edit`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się odgrzać leada." };
  }
}

// Utwórz umowę z zapytania (lead) i wyślij do podpisu — tylko Szef.
// E-mail idzie automatycznie, gdy skonfigurowany (Resend); inaczej zwracamy link do ręcznego wysłania.
export async function sendContractForInquiryAction(
  inquiryId: string, ov: EsignFieldOverrides,
): Promise<{ ok: boolean; error?: string; link?: string; emailSkipped?: boolean }> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false, error: "Tylko Szef wysyła umowy." };
  const created = await createEsignFromInquiry({ inquiryId, ...ov }, me.id ?? null);
  if (!created.ok || !created.id) return { ok: false, error: created.error ?? "Nie udało się utworzyć umowy." };
  const sent = await sendEsignContract(created.id);
  if (!sent.ok) return { ok: false, error: sent.error ?? "Nie udało się wysłać umowy." };
  // Wysłana umowa = lead obsłużony → schodzi ze statusu NEW, więc znika z sekcji „Zgłoszenia z konfiguratora".
  try { await setInquiryStatus(inquiryId, "OFFER_SENT"); } catch { /* status opcjonalny — nie blokuje wysyłki */ }
  revalidatePath(`/inquiries/${inquiryId}/edit`);
  revalidatePath("/inquiries");
  revalidatePath("/dashboard");
  return { ok: true, link: sent.link, emailSkipped: sent.emailSkipped };
}

// Podgląd umowy z zapytania (bez zapisu i wysyłki) — Szef sprawdza treść przed wysłaniem.
export async function previewContractForInquiryAction(inquiryId: string, ov: EsignFieldOverrides): Promise<{ ok: boolean; html?: string; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false, error: "Tylko Szef." };
  const r = await createEsignFromInquiry({ inquiryId, ...ov, preview: true }, null);
  return { ok: r.ok, html: r.html, error: r.error };
}

// Usunięcie zapytania (np. testowe) — tylko Szef.
export async function deleteInquiryAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false, error: "Tylko Szef może usuwać zapytania." };
  try {
    await deleteInquiry(id);
    revalidatePath("/inquiries");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się usunąć zapytania." };
  }
}

// §6.2 Blokada auto-zamykania (decyzja Szefa).
export async function setInquiryAutoCloseBlockedAction(id: string, blocked: boolean): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_MSG };
  try {
    await setInquiryAutoCloseBlocked(id, blocked);
    revalidatePath(`/inquiries/${id}/edit`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd." };
  }
}

// §6.2 Ręczne uruchomienie auto-zamykania nieaktywnych leadów (tylko Szef).
export async function autoCloseStaleLeadsAction(): Promise<{ ok: boolean; closed: number; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, closed: 0, error: DEMO_MSG };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false, closed: 0, error: "Tylko Szef." };
  try {
    const r = await autoCloseStaleLeads();
    revalidatePath("/inquiries");
    return { ok: true, closed: r.closed };
  } catch (e) {
    return { ok: false, closed: 0, error: e instanceof Error ? e.message : "Błąd auto-zamykania." };
  }
}
