// Warstwa danych: klienci. Odczyt/zapis przez Supabase; w TRYBIE DEMO
// odczyt zwraca dane demonstracyjne, a zapis jest blokowany w Server Action.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { CustomerRecord, CustomerType } from "./types";
import { DEMO_CUSTOMERS } from "./demo";

export interface CustomerInput {
  type: CustomerType;
  name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  tax_id?: string | null;
  notes?: string | null;
}

export async function listCustomers(): Promise<CustomerRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_CUSTOMERS;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerRecord[];
}

export async function getCustomer(id: string): Promise<CustomerRecord | null> {
  if (!isSupabaseConfigured()) {
    return DEMO_CUSTOMERS.find((c) => c.id === id) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as CustomerRecord;
}

export async function createCustomer(input: CustomerInput): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("customers")
    .insert({ ...input, created_by: user?.id ?? null })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}
