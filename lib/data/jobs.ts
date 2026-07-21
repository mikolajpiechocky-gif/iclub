// Warstwa danych: zlecenia (jobs) i ich etapy. Odczyt przez Supabase;
// w TRYBIE DEMO zwraca dane przykładowe wywiedzione z rezerwacji demo.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { JobWithReservation, JobStageRecord, JobStatus, StageStatus } from "./types";
import { DEMO_RESERVATIONS } from "./demo-resources";
import { ICLUB_STAGES } from "@/lib/domain/stages";

const RESV_SELECT =
  "*, reservation:reservations(*, customer:customers(id,name), tent:tents!tent_id(id,name), package:packages(id,name))";

const now = "2026-07-14T10:00:00.000Z";

const DEMO_JOBS: JobWithReservation[] = DEMO_RESERVATIONS.map((r, i) => ({
  id: `demo-job-${i + 1}`,
  reservation_id: r.id,
  business_line: r.business_line,
  title: r.event_type ?? "Zlecenie",
  event_date: r.event_date,
  status: (i === 0 ? "IN_PROGRESS" : "PLANNED") as JobStatus,
  owner_bonus: 0,
  created_at: now,
  updated_at: now,
  reservation: r,
}));

function demoStages(jobId: string): JobStageRecord[] {
  return ICLUB_STAGES.map((s, i) => ({
    id: `${jobId}-s${i}`,
    job_id: jobId,
    stage_key: s.key,
    title: s.title,
    status: (i < 2 ? "DONE" : i === 2 ? "IN_PROGRESS" : "TODO") as StageStatus,
    sort: i,
    planned_at: null,
  }));
}

export async function listJobs(): Promise<JobWithReservation[]> {
  if (!isSupabaseConfigured()) return DEMO_JOBS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(RESV_SELECT)
    .order("event_date", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as JobWithReservation[];
}

export async function listAssignedJobs(profileId: string): Promise<JobWithReservation[]> {
  if (!isSupabaseConfigured()) return DEMO_JOBS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_assignments")
    .select(`job:jobs(${RESV_SELECT})`)
    .eq("profile_id", profileId)
    .eq("status", "APPROVED");
  if (error) return []; // degraduj łagodnie (np. okno migracji) zamiast crashować ekran „Start"
  const rows = (data ?? []) as unknown as { job: JobWithReservation | null }[];
  return rows.map((r) => r.job).filter((j): j is JobWithReservation => Boolean(j));
}

// Realizacje iClub „do zgarnięcia": nie zrealizowane (PLANNED/IN_PROGRESS), dziś i
// w przyszłość, BEZ zaakceptowanego zespołu i których dany pracownik jeszcze nie tknął.
export async function listClaimableJobs(profileId: string): Promise<JobWithReservation[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("jobs")
    .select(RESV_SELECT)
    .eq("business_line", "ICLUB")
    .in("status", ["PLANNED", "IN_PROGRESS"])
    .gte("event_date", today)
    .order("event_date", { ascending: true });
  if (error) return [];
  const jobs = (data ?? []) as unknown as JobWithReservation[];
  if (!jobs.length) return [];

  const ids = jobs.map((j) => j.id);
  const { data: aData } = await supabase.from("job_assignments").select("job_id, profile_id, status").in("job_id", ids);
  const assigns = (aData ?? []) as { job_id: string; profile_id: string; status: string }[];
  const taken = new Set(assigns.filter((a) => a.status === "APPROVED").map((a) => a.job_id));
  const mine = new Set(assigns.filter((a) => a.profile_id === profileId).map((a) => a.job_id));
  return jobs.filter((j) => {
    const st = j.reservation?.status;
    return !taken.has(j.id) && !mine.has(j.id) && st !== "CANCELLED" && st !== "EXPIRED";
  });
}

// §19.4 Liczba zaliczonych realizacji iClub pracownika w danym miesiącu (YYYY-MM).
// Realizacja liczy się, gdy: zakończona (DONE), iClub, przypisany pracownik (APPROVED).
// Jedno zlecenie = jedna realizacja (nawet gdy montaż/demontaż w różnych dniach).
export async function countDoneIclubRealizations(profileId: string, monthPrefix: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_assignments")
    .select("job:jobs(id, status, business_line, event_date)")
    .eq("profile_id", profileId)
    .eq("status", "APPROVED");
  if (error) return 0;
  const rows = (data ?? []) as unknown as { job: { id: string; status: string; business_line: string; event_date: string | null } | null }[];
  const seen = new Set<string>();
  for (const r of rows) {
    const j = r.job;
    if (!j || j.status !== "DONE" || j.business_line !== "ICLUB") continue;
    if (!j.event_date || !j.event_date.startsWith(monthPrefix)) continue;
    seen.add(j.id);
  }
  return seen.size;
}

export async function getJob(id: string): Promise<JobWithReservation | null> {
  if (!isSupabaseConfigured()) return DEMO_JOBS.find((j) => j.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("jobs").select(RESV_SELECT).eq("id", id).single();
  if (error) return null;
  return data as unknown as JobWithReservation;
}

// Zlecenie 1:1 z rezerwacją — pobierane po id rezerwacji (rezerwacja = realizacja).
export async function getJobByReservation(reservationId: string): Promise<JobWithReservation | null> {
  if (!isSupabaseConfigured()) return DEMO_JOBS.find((j) => j.reservation_id === reservationId) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("jobs").select(RESV_SELECT).eq("reservation_id", reservationId).maybeSingle();
  if (error) return null;
  return (data as unknown as JobWithReservation) ?? null;
}

export async function getJobStages(jobId: string): Promise<JobStageRecord[]> {
  if (!isSupabaseConfigured()) return demoStages(jobId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_stages")
    .select("*")
    .eq("job_id", jobId)
    .order("sort");
  if (error) throw new Error(error.message);
  return (data ?? []) as JobStageRecord[];
}

export async function setStageStatus(stageId: string, status: StageStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("job_stages").update({ status }).eq("id", stageId);
  if (error) throw new Error(error.message);
}

export async function setJobStatus(jobId: string, status: JobStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
  if (error) throw new Error(error.message);
}
