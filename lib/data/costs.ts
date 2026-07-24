// Warstwa danych: koszty. Odczyt/zapis Supabase; fallback demo.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { CostWithJob, CostStatus } from "./types";
import { logActivity } from "./activity";

const DEMO_COSTS: CostWithJob[] = [
  { id: "demo-cost1", job_id: "demo-job-1", job: { id: "demo-job-1", title: "Osiemnastka" }, category: "Paliwo", amount: 240, spent_on: "2026-07-18", note: "Tankowanie Orlen", status: "PENDING", created_at: "2026-07-18T10:00:00.000Z", updated_at: "2026-07-18T10:00:00.000Z" },
  { id: "demo-cost2", job_id: "demo-job-1", job: { id: "demo-job-1", title: "Osiemnastka" }, category: "Autostrada", amount: 45, spent_on: "2026-07-18", note: null, status: "VERIFIED", created_at: "2026-07-18T10:00:00.000Z", updated_at: "2026-07-18T10:00:00.000Z" },
  { id: "demo-cost3", job_id: "demo-job-2", job: { id: "demo-job-2", title: "Wesele" }, category: "Szampan", amount: 120, spent_on: "2026-07-18", note: null, status: "PENDING", created_at: "2026-07-18T10:00:00.000Z", updated_at: "2026-07-18T10:00:00.000Z" },
];

export interface CostInput {
  job_id: string | null;
  category: string;
  amount: number;
  spent_on: string | null;
  note: string | null;
}

export async function listCosts(): Promise<CostWithJob[]> {
  if (!isSupabaseConfigured()) return DEMO_COSTS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("costs")
    .select("*, job:jobs(id, title)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CostWithJob[];
}

export async function createCost(input: CostInput): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("costs").insert({ ...input, created_by: user?.id ?? null }).select("id").single();
  if (error) throw new Error(error.message);
  await logActivity("cost", data.id as string, input.category, "Dodano koszt", `${input.amount} zł`);
}

export async function setCostStatus(id: string, status: CostStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("costs").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity("cost", id, null, status === "VERIFIED" ? "Zatwierdzono" : status === "REJECTED" ? "Odrzucono" : "Do weryfikacji");
}
