// Warstwa danych: rezerwacje. Tworzenie rezerwacji automatycznie generuje
// zlecenie (job) i podstawowe etapy (job_stages) — §28/§50 instrukcji master.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ReservationRecord, ReservationWithRefs, ReservationStatus, BusinessLine } from "./types";
import { DEMO_RESERVATIONS } from "./demo-resources";
import { stagesForBusinessLine } from "@/lib/domain/stages";

export interface ReservationInput {
  business_line: BusinessLine;
  customer_id: string | null;
  inquiry_id?: string | null;
  event_type?: string | null;
  event_date?: string | null;
  setup_date?: string | null;
  teardown_date?: string | null;
  location?: string | null;
  guests?: number | null;
  tent_id: string | null;
  package_id: string | null;
  addon_ids: string[];
  price?: number | null;
  discount?: number;
  deposit?: number;
  is_invoice?: boolean;
  source?: string | null;
  status: ReservationStatus;
  expires_at?: string | null;
  notes?: string | null;
}

export async function listReservations(): Promise<ReservationWithRefs[]> {
  if (!isSupabaseConfigured()) return DEMO_RESERVATIONS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*, customer:customers(id,name), tent:tents(id,name), package:packages(id,name)")
    .order("event_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ReservationWithRefs[];
}

export async function getReservation(id: string): Promise<ReservationRecord | null> {
  if (!isSupabaseConfigured()) return DEMO_RESERVATIONS.find((r) => r.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("reservations").select("*").eq("id", id).single();
  if (error) return null;
  return data as ReservationRecord;
}

// Tworzy rezerwację + automatyczne zlecenie + etapy.
export async function createReservation(input: ReservationInput): Promise<{ id: string; jobId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: reservation, error: rErr } = await supabase
    .from("reservations")
    .insert({ ...input, created_by: user?.id ?? null })
    .select("id, business_line, event_type, event_date")
    .single();
  if (rErr) throw new Error(rErr.message);

  const { data: job, error: jErr } = await supabase
    .from("jobs")
    .insert({
      reservation_id: reservation.id,
      business_line: reservation.business_line,
      title: reservation.event_type ?? "Zlecenie",
      event_date: reservation.event_date,
      status: "PLANNED",
    })
    .select("id")
    .single();
  if (jErr) throw new Error(jErr.message);

  const stages = stagesForBusinessLine(input.business_line).map((s, i) => ({
    job_id: job.id,
    stage_key: s.key,
    title: s.title,
    sort: i,
  }));
  const { error: sErr } = await supabase.from("job_stages").insert(stages);
  if (sErr) throw new Error(sErr.message);

  return { id: reservation.id as string, jobId: job.id as string };
}

export async function updateReservation(id: string, input: ReservationInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("reservations").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}
