// Warstwa danych: pracownicy (profile) + ich stawki/premie (poufne, tylko OWNER).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { EmployeeWithRate, EmployeeRate, ProfileRecord, IclubSettlementMode } from "./types";
import { DEMO_PROFILE } from "./profiles";

const DEMO_EMPLOYEES: EmployeeWithRate[] = [
  { ...DEMO_PROFILE, full_name: "Mikołaj", role: "OWNER", rate: null },
  {
    id: "demo-emp1", full_name: "Marek W.", role: "EMPLOYEE",
    rate: { profile_id: "demo-emp1", rate_model: "FLAT_PLUS_BONUS", hourly_rate: null, iclub_flat: 250, far_bonus: 100, gastro_bonus: 80, review_bonus: 30, reel_bonus: 30, upsell_percent: 15, notes: null, iclub_settlement_mode: "THRESHOLD" },
  },
  {
    id: "demo-emp2", full_name: "Kuba L.", role: "EMPLOYEE",
    rate: { profile_id: "demo-emp2", rate_model: "HOURLY", hourly_rate: 40, iclub_flat: null, far_bonus: null, gastro_bonus: null, review_bonus: null, reel_bonus: null, upsell_percent: 15, notes: null, iclub_settlement_mode: "FLAT" },
  },
];

export interface EmployeeRateInput {
  rate_model: EmployeeRate["rate_model"];
  hourly_rate: number | null;
  iclub_flat: number | null;
  far_bonus: number | null;
  gastro_bonus: number | null;
  review_bonus: number | null;
  reel_bonus: number | null;
  upsell_percent: number | null;
  notes: string | null;
  iclub_settlement_mode: IclubSettlementMode;
}

export async function listEmployees(): Promise<EmployeeWithRate[]> {
  if (!isSupabaseConfigured()) return DEMO_EMPLOYEES;

  const supabase = await createClient();
  const [{ data: profiles }, { data: rates }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
    supabase.from("employee_rates").select("*"),
  ]);

  const rateByProfile = new Map<string, EmployeeRate>();
  for (const r of (rates ?? []) as EmployeeRate[]) rateByProfile.set(r.profile_id, r);

  return ((profiles ?? []) as ProfileRecord[]).map((p) => ({
    ...p,
    rate: rateByProfile.get(p.id) ?? null,
  }));
}

export async function getEmployee(id: string): Promise<EmployeeWithRate | null> {
  if (!isSupabaseConfigured()) return DEMO_EMPLOYEES.find((e) => e.id === id) ?? null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", id)
    .single();
  if (!profile) return null;

  const { data: rate } = await supabase
    .from("employee_rates")
    .select("*")
    .eq("profile_id", id)
    .maybeSingle();

  return { ...(profile as ProfileRecord), rate: (rate as EmployeeRate) ?? null };
}

export async function upsertEmployeeRate(profileId: string, input: EmployeeRateInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_rates")
    .upsert({ profile_id: profileId, ...input }, { onConflict: "profile_id" });
  if (error) throw new Error(error.message);
}
