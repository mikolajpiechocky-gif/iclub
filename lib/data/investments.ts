// Warstwa danych: inwestycje (osobny rejestr majątku). NIE są kosztem realizacji.
// Odczyt/zapis Supabase; fallback demo.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { InvestmentRecord } from "./types";

const DEMO_INVESTMENTS: InvestmentRecord[] = [
  { id: "demo-inv1", name: "Namiot 6x8", amount: 5600, category: "Sprzęt", note: null, created_at: "2025-04-01T10:00:00.000Z" },
  { id: "demo-inv2", name: "Kangoo", amount: 10000, category: "Pojazd", note: null, created_at: "2025-03-01T10:00:00.000Z" },
  { id: "demo-inv3", name: "Kampanie IG", amount: 100, category: "Marketing", note: null, created_at: "2025-05-01T10:00:00.000Z" },
];

export interface InvestmentInput {
  name: string;
  amount: number;
  category: string;
  note: string | null;
}

export async function listInvestments(): Promise<InvestmentRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_INVESTMENTS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .order("amount", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as InvestmentRecord[];
}

export async function createInvestment(input: InvestmentInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("investments").insert(input);
  if (error) throw new Error(error.message);
}

export async function deleteInvestment(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("investments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
