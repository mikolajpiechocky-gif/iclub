// Warstwa danych: zgłoszenia / szkody / incydenty. Supabase; fallback demo.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { IncidentWithJob, IncidentPriority, IncidentStatus } from "./types";

const now = "2026-07-18T12:00:00.000Z";

const DEMO_INCIDENTS: IncidentWithJob[] = [
  { id: "di1", job_id: "demo-job-1", job: { id: "demo-job-1", title: "Osiemnastka" }, category: "Uszkodzenie", description: "Rozdarcie ~15 cm przy wejściu, prawdopodobnie od wiatru.", equipment: "Namiot 6×8 Green — poszycie", priority: "HIGH", status: "OPEN", resolution: null, created_at: now, updated_at: now },
  { id: "di2", job_id: null, job: null, category: "Brak sprzętu", description: "Brakuje jednego statywu do głowicy LED.", equipment: "Głowica LED", priority: "MEDIUM", status: "IN_PROGRESS", resolution: null, created_at: now, updated_at: now },
];

export interface IncidentInput {
  job_id: string | null;
  category: string;
  description: string | null;
  equipment: string | null;
  priority: IncidentPriority;
}

export async function listIncidents(): Promise<IncidentWithJob[]> {
  if (!isSupabaseConfigured()) return DEMO_INCIDENTS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("*, job:jobs(id, title)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as IncidentWithJob[];
}

export async function createIncident(input: IncidentInput): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("incidents").insert({ ...input, reported_by: user?.id ?? null });
  if (error) throw new Error(error.message);
}

export async function setIncidentStatus(id: string, status: IncidentStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("incidents").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

// §II.7 Odpowiedź Szefa na zgłoszenie.
export async function setIncidentResolution(id: string, resolution: string | null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("incidents").update({ resolution }).eq("id", id);
  if (error) throw new Error(error.message);
}
