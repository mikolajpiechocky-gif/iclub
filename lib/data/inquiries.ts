// Warstwa danych: zapytania. Odczyt/zapis przez Supabase; w TRYBIE DEMO
// odczyt zwraca dane demonstracyjne, a zapis jest blokowany w Server Action.
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  InquiryRecord,
  InquiryWithCustomer,
  InquiryStatus,
  InquirySource,
} from "./types";
import { DEMO_INQUIRIES } from "./demo";

const nowIso = () => new Date().toISOString();
// Statusy „otwarte" — podlegają auto-zamykaniu po nieaktywności.
const OPEN_STATUSES: InquiryStatus[] = ["NEW", "CONTACTED", "OFFER_SENT", "WAITING", "REHEATED"];

export interface InquiryInput {
  customer_id: string | null;
  event_type?: string | null;
  event_date?: string | null;
  location?: string | null;
  guests?: number | null;
  tent_interest?: string | null;
  package_interest?: string | null;
  addons_note?: string | null;
  source?: InquirySource | null;
  status: InquiryStatus;
  notes?: string | null;
}

export async function listInquiries(): Promise<InquiryWithCustomer[]> {
  if (!isSupabaseConfigured()) return DEMO_INQUIRIES;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("*, customer:customers(id, name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as InquiryWithCustomer[];
}

export async function getInquiry(id: string): Promise<InquiryRecord | null> {
  if (!isSupabaseConfigured()) {
    return DEMO_INQUIRIES.find((i) => i.id === id) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as InquiryRecord;
}

export async function createInquiry(input: InquiryInput): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("inquiries")
    .insert({ ...input, created_by: user?.id ?? null, last_activity_at: nowIso() })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function updateInquiry(id: string, input: InquiryInput): Promise<void> {
  const supabase = await createClient();
  // Ręczna edycja = istotna aktywność (liczy się do 21-dniowego auto-zamykania).
  const { error } = await supabase.from("inquiries").update({ ...input, last_activity_at: nowIso() }).eq("id", id);
  if (error) throw new Error(error.message);
}

// §6.3 „Odgrzanie": przywraca przegrany/inny lead do obsługi, zachowując historię.
export async function reactivateInquiry(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: cur } = await supabase.from("inquiries").select("status, reactivation_count").eq("id", id).single();
  const prev = (cur as { status: InquiryStatus; reactivation_count: number } | null);
  const { error } = await supabase
    .from("inquiries")
    .update({
      status: "REHEATED",
      previous_status: prev?.status ?? null,
      reactivation_count: (prev?.reactivation_count ?? 0) + 1,
      reactivated_at: nowIso(),
      last_activity_at: nowIso(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setInquiryAutoCloseBlocked(id: string, blocked: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").update({ auto_close_blocked: blocked }).eq("id", id);
  if (error) throw new Error(error.message);
}

// §6.2 Auto-zamykanie: otwarte leady bez aktywności ≥21 dni → przegrane
// (powód automatic_inactivity), o ile Szef nie zablokował. Przez service_role
// (działa też z crona). „Aktywna rozmowa" jest z natury świeża → nie łapie się.
export async function autoCloseStaleLeads(days = 21): Promise<{ closed: number }> {
  if (!isServiceRoleConfigured()) return { closed: 0 };
  const s = createAdminClient();
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await s
    .from("inquiries")
    .update({ status: "LOST", lost_reason: "automatic_inactivity" })
    .in("status", OPEN_STATUSES)
    .lt("last_activity_at", cutoff)
    .eq("auto_close_blocked", false)
    .select("id");
  return { closed: (data ?? []).length };
}
