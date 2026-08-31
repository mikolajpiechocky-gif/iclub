// Integracja z TAURUS — OSOBNY projekt Supabase (oxsxrvecvxlwfdrraudm), nie wspólna baza.
// Zapisy przez service_role TAURUSA (server-only). Aktywna tylko gdy ustawione
// TAURUS_SUPABASE_URL + TAURUS_SERVICE_ROLE_KEY. Minimalny zakres: jobs (kalendarz + zadania
// serwisowe), odczyt elapsed_minutes (koszt robocizny), iclub_hour_adjustments (odliczenie z TAURUS).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isTaurusConfigured(): boolean {
  return Boolean(process.env.TAURUS_SUPABASE_URL && process.env.TAURUS_SERVICE_ROLE_KEY);
}
function taurusClient(): SupabaseClient {
  return createClient(process.env.TAURUS_SUPABASE_URL!, process.env.TAURUS_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface TaurusCheckItem { label: string; done: boolean; section: "scope" | "check"; }
export interface TaurusJobInput {
  title: string;
  status?: "planned" | "started" | "paused" | "completed" | "cancelled";
  job_type: "service" | "internal" | "field" | "snow";
  source: "iclub_event" | "iclub_service";
  scheduled_date: string;                 // YYYY-MM-DD
  assigned_worker_id?: string | null;
  checklist?: TaurusCheckItem[];
  service_category?: "cleanup" | "repair" | "check" | "maintenance" | null;
  internal_notes?: string | null;
}

// Utwórz zadanie/wydarzenie w TAURUS (company='iclub'). Zwraca id wiersza jobs (albo null gdy niepodłączone).
export async function createTaurusJob(input: TaurusJobInput): Promise<string | null> {
  if (!isTaurusConfigured()) return null;
  const s = taurusClient();
  const { data, error } = await s.from("jobs").insert({
    title: input.title,
    status: input.status ?? "planned",
    job_type: input.job_type,
    source: input.source,
    company: "iclub",
    scheduled_date: input.scheduled_date,
    assigned_worker_id: input.assigned_worker_id ?? null,
    checklist: input.checklist ?? [],
    service_category: input.service_category ?? null,
    internal_notes: input.internal_notes ?? null,
    customer_id: null,
  }).select("id").single();
  if (error) throw new Error(`TAURUS job create: ${error.message}`);
  return (data as { id: string }).id;
}

export async function updateTaurusJob(
  jobId: string,
  patch: Partial<{ title: string; scheduled_date: string; status: string; internal_notes: string; checklist: TaurusCheckItem[] }>,
): Promise<void> {
  if (!isTaurusConfigured()) return;
  const s = taurusClient();
  const { error } = await s.from("jobs").update(patch).eq("id", jobId);
  if (error) throw new Error(`TAURUS job update: ${error.message}`);
}

export interface TaurusIclubJob { id: string; title: string; scheduled_date: string; elapsed_minutes: number; assigned_worker_id: string | null; source: string | null; }
// Zadania iClub w TAURUS w oknie dat (do policzenia kosztu robocizny serwisu z elapsed_minutes).
export async function readIclubJobsInRange(from: string, to: string): Promise<TaurusIclubJob[]> {
  if (!isTaurusConfigured()) return [];
  const s = taurusClient();
  const { data, error } = await s.from("jobs")
    .select("id, title, scheduled_date, elapsed_minutes, assigned_worker_id, source")
    .eq("company", "iclub").gte("scheduled_date", from).lte("scheduled_date", to).neq("status", "cancelled");
  if (error) throw new Error(`TAURUS jobs read: ${error.message}`);
  return (data ?? []) as TaurusIclubJob[];
}

export async function getWorkerRate(workerId: string): Promise<number> {
  if (!isTaurusConfigured() || !workerId) return 0;
  const s = taurusClient();
  const { data } = await s.from("profiles").select("hourly_rate_net").eq("id", workerId).maybeSingle();
  return data ? Number((data as { hourly_rate_net: number }).hourly_rate_net) || 0 : 0;
}

// Korekta godzin iClub (odliczenie z kosztów TAURUS). Idempotentne per (worker, month).
export async function upsertHourAdjustment(workerId: string, month: string, hours: number, note: string | null): Promise<void> {
  if (!isTaurusConfigured()) return;
  const s = taurusClient();
  const { data: existing } = await s.from("iclub_hour_adjustments").select("id").eq("worker_id", workerId).eq("month", month).maybeSingle();
  if (existing) {
    await s.from("iclub_hour_adjustments").update({ hours, note }).eq("id", (existing as { id: string }).id);
  } else {
    await s.from("iclub_hour_adjustments").insert({ worker_id: workerId, month, hours, note });
  }
}
