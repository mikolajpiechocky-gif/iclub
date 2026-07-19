"use server";
// Server Actions modułu Zapytania: walidacja + zapis przez warstwę danych.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createInquiry, updateInquiry, type InquiryInput } from "@/lib/data/inquiries";
import type { InquiryStatus, InquirySource } from "@/lib/data/types";

export interface InquiryFormValues {
  customer_id: string;
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

const STATUSES: InquiryStatus[] = ["NEW", "CONTACTED", "OFFER_SENT", "WAITING", "WON", "LOST"];

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
