// Warstwa danych: zapytania. Odczyt/zapis przez Supabase; w TRYBIE DEMO
// odczyt zwraca dane demonstracyjne, a zapis jest blokowany w Server Action.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  InquiryRecord,
  InquiryWithCustomer,
  InquiryStatus,
  InquirySource,
} from "./types";
import { DEMO_INQUIRIES } from "./demo";

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
    .insert({ ...input, created_by: user?.id ?? null })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function updateInquiry(id: string, input: InquiryInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}
