// Warstwa danych: przypisania pracowników do zleceń (§9).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { EmployeeRate } from "./types";

export type AssignmentStatus = "REQUESTED" | "APPROVED";

export interface JobAssignment {
  id: string;
  job_id: string;
  profile_id: string;
  is_lead: boolean;
  status: AssignmentStatus;
  note: string | null;
  employee: { id: string; full_name: string; role: string; avatar_url?: string | null } | null;
  rate: EmployeeRate | null;
}

const DEMO_RATE_MAREK: EmployeeRate = { profile_id: "demo-emp1", rate_model: "FLAT_PLUS_BONUS", hourly_rate: null, iclub_flat: 250, far_bonus: 100, gastro_bonus: 80, review_bonus: 30, reel_bonus: 30, upsell_percent: 15, notes: null };
const DEMO_RATE_KUBA: EmployeeRate = { profile_id: "demo-emp2", rate_model: "HOURLY", hourly_rate: 40, iclub_flat: null, far_bonus: null, gastro_bonus: null, review_bonus: null, reel_bonus: null, upsell_percent: 15, notes: null };

const DEMO_ASSIGNMENTS: Record<string, JobAssignment[]> = {
  "demo-job-1": [
    { id: "demo-as1", job_id: "demo-job-1", profile_id: "demo-emp1", is_lead: true, status: "APPROVED", note: null, employee: { id: "demo-emp1", full_name: "Marek W.", role: "EMPLOYEE" }, rate: DEMO_RATE_MAREK },
    { id: "demo-as2", job_id: "demo-job-1", profile_id: "demo-emp2", is_lead: false, status: "APPROVED", note: null, employee: { id: "demo-emp2", full_name: "Kuba L.", role: "EMPLOYEE" }, rate: DEMO_RATE_KUBA },
  ],
};

export async function listJobAssignments(jobId: string): Promise<JobAssignment[]> {
  if (!isSupabaseConfigured()) return DEMO_ASSIGNMENTS[jobId] ?? [];

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("job_assignments")
    .select("*, employee:profiles!profile_id(id, full_name, role, avatar_url)")
    .eq("job_id", jobId)
    .order("is_lead", { ascending: false });
  if (error) throw new Error(error.message);

  const list = (rows ?? []) as unknown as JobAssignment[];
  for (const a of list) a.rate = null;

  const ids = list.map((a) => a.profile_id);
  if (ids.length) {
    const { data: rates } = await supabase.from("employee_rates").select("*").in("profile_id", ids);
    const byId = new Map<string, EmployeeRate>();
    for (const r of (rates ?? []) as EmployeeRate[]) byId.set(r.profile_id, r);
    for (const a of list) a.rate = byId.get(a.profile_id) ?? null;
  }
  return list;
}

export async function assignEmployee(jobId: string, profileId: string, isLead = false, status: AssignmentStatus = "APPROVED"): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("job_assignments")
    .insert({ job_id: jobId, profile_id: profileId, is_lead: isLead, status, assigned_by: user?.id ?? null });
  if (error) throw new Error(error.message);
}

// Szef akceptuje prośbę pracownika o przypisanie. Zwraca, czy wiersz istniał
// (do pominięcia powiadomienia, gdy prośba w międzyczasie zniknęła — wyścig).
export async function approveAssignment(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("job_assignments").update({ status: "APPROVED" }).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function removeAssignment(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("job_assignments").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function setAssignmentLead(id: string, isLead: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("job_assignments").update({ is_lead: isLead }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setJobOwnerBonus(jobId: string, amount: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ owner_bonus: amount }).eq("id", jobId);
  if (error) throw new Error(error.message);
}
