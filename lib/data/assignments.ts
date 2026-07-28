// Warstwa danych: przypisania pracowników do zleceń (§9).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { EmployeeRate } from "./types";
import type { EarningsBreakdown } from "@/lib/domain/earnings";
import { getSettings } from "./settings";
import { settlementForRealization, rulesFromSettings } from "@/lib/domain/iclub-settlement";

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
  // Zamrożone rozliczenie z chwili zakończenia realizacji (null = jeszcze nie zamknięte).
  earnings_snapshot: EarningsBreakdown | null;
}

const DEMO_RATE_MAREK: EmployeeRate = { profile_id: "demo-emp1", rate_model: "FLAT_PLUS_BONUS", hourly_rate: null, iclub_flat: 250, far_bonus: 100, gastro_bonus: 80, review_bonus: 30, reel_bonus: 30, upsell_percent: 15, notes: null, iclub_settlement_mode: "THRESHOLD", iclub_threshold: 4, iclub_free_hours: 8, iclub_free_hourly: 32.4 };
const DEMO_RATE_KUBA: EmployeeRate = { profile_id: "demo-emp2", rate_model: "HOURLY", hourly_rate: 40, iclub_flat: null, far_bonus: null, gastro_bonus: null, review_bonus: null, reel_bonus: null, upsell_percent: 15, notes: null, iclub_settlement_mode: "FLAT", iclub_threshold: null, iclub_free_hours: null, iclub_free_hourly: null };

const DEMO_ASSIGNMENTS: Record<string, JobAssignment[]> = {
  "demo-job-1": [
    { id: "demo-as1", job_id: "demo-job-1", profile_id: "demo-emp1", is_lead: true, status: "APPROVED", note: null, employee: { id: "demo-emp1", full_name: "Marek W.", role: "EMPLOYEE" }, rate: DEMO_RATE_MAREK, earnings_snapshot: null },
    { id: "demo-as2", job_id: "demo-job-1", profile_id: "demo-emp2", is_lead: false, status: "APPROVED", note: null, employee: { id: "demo-emp2", full_name: "Kuba L.", role: "EMPLOYEE" }, rate: DEMO_RATE_KUBA, earnings_snapshot: null },
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
  // Tylko realne przejście REQUESTED→APPROVED zwraca wiersz — dzięki temu ponowne kliknięcie
  // „Akceptuj" (albo akceptacja już zatwierdzonej) nie wysyła drugiego powiadomienia/push.
  const { data, error } = await supabase.from("job_assignments").update({ status: "APPROVED" }).eq("id", id).eq("status", "REQUESTED").select("id");
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

// Zapis zamrożonego rozliczenia (snapshot) w chwili zakończenia realizacji.
export async function setAssignmentEarningsSnapshot(id: string, snapshot: EarningsBreakdown): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("job_assignments").update({ earnings_snapshot: snapshot }).eq("id", id);
  if (error) throw new Error(error.message);
}

// §24 Rozliczenia pracownika: zakończone realizacje z zamrożonym wynagrodzeniem + status wypłaty.
export interface EmployeeSettlementRow {
  assignmentId: string;
  jobId: string;
  reservationId: string | null;
  title: string;
  eventDate: string | null;
  amount: number; // baza (zamrożone wynagrodzenie) — premie opinia/rolka i paliwo doliczane osobno
  settledAt: string | null;
  reviewGiven: boolean; // opinia
  reelGiven: boolean;   // rolka
  reelLink: string | null;
  fuelAmount: number;   // zwrot za paliwo (własne auto)
}

interface RawSettlementRow {
  id: string;
  is_lead: boolean | null;
  earnings_snapshot: EarningsBreakdown | null;
  settled_at: string | null;
  review_given: boolean | null;
  reel_given: boolean | null;
  reel_link: string | null;
  fuel_amount: number | string | null;
  job: { id: string; title: string | null; status: string; business_line: string; event_date: string | null; owner_bonus: number | string | null; reservation: { id: string; event_type: string | null; tent_extra: string | null; rental_settlement_flat: number | string | null; customer: { name: string | null } | null } | null } | null;
}

export async function listEmployeeSettlements(profileId: string): Promise<EmployeeSettlementRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const [{ data }, { data: rateData }, settings] = await Promise.all([
    supabase
      .from("job_assignments")
      .select("id, is_lead, earnings_snapshot, settled_at, status, review_given, reel_given, reel_link, fuel_amount, job:jobs(id, title, status, business_line, event_date, owner_bonus, reservation:reservations(id, event_type, tent_extra, rental_settlement_flat, customer:customers(name)))")
      .eq("profile_id", profileId)
      .eq("status", "APPROVED"),
    supabase.from("employee_rates").select("*").eq("profile_id", profileId).maybeSingle(),
    getSettings(),
  ]);
  const rate = (rateData as EmployeeRate) ?? null;
  const rules = rulesFromSettings(settings);

  const done = ((data ?? []) as unknown as RawSettlementRow[])
    .filter((r) => r.job?.status === "DONE")
    .sort((a, b) => ((a.job!.event_date ?? "") < (b.job!.event_date ?? "") ? -1 : 1)); // rosnąco → indeks miesiąca

  // §rozliczenie Gdy brak zamrożonego wynagrodzenia (realizacja domknięta źle/starym trybem albo
  // bez snapshotu) — liczymy na żywo, żeby dało się rozliczyć. Indeks miesiąca z kolejności realizacji.
  const monthIdx = new Map<string, number>();
  const out = done.map((r) => {
    const month = (r.job!.event_date ?? "").slice(0, 7);
    const priorCount = monthIdx.get(month) ?? 0;
    monthIdx.set(month, priorCount + 1);

    const snapTotal = Number(r.earnings_snapshot?.total ?? 0);
    let amount = snapTotal;
    if (!(snapTotal > 0)) {
      const ownerBonus = Number(r.job!.owner_bonus ?? 0) || 0;
      if (r.job!.business_line === "EQUIPMENT_RENTAL") {
        const flat = r.job!.reservation?.rental_settlement_flat != null ? Number(r.job!.reservation.rental_settlement_flat) : null;
        amount = flat != null ? Math.round((flat + ownerBonus) * 100) / 100 : ownerBonus; // godzinowa = bez dodatkowej wypłaty
      } else if (rate) {
        const s = settlementForRealization(rules, priorCount, { hasGastro: r.job!.reservation?.tent_extra === "GASTRO", rate });
        amount = Math.round((s.total + ownerBonus) * 100) / 100;
      }
    }

    return {
      assignmentId: r.id,
      jobId: r.job!.id,
      reservationId: r.job!.reservation?.id ?? null,
      title: r.job!.reservation?.customer?.name ?? r.job!.reservation?.event_type ?? r.job!.title ?? "Realizacja",
      eventDate: r.job!.event_date ?? null,
      amount,
      settledAt: r.settled_at ?? null,
      reviewGiven: Boolean(r.review_given),
      reelGiven: Boolean(r.reel_given),
      reelLink: r.reel_link ?? null,
      fuelAmount: Number(r.fuel_amount ?? 0) || 0,
    };
  });
  return out.sort((a, b) => ((a.eventDate ?? "") < (b.eventDate ?? "") ? 1 : -1)); // wyświetlanie malejąco
}

// §rozliczenie Zaznaczenie premii/zwrotów rozliczanych per realizacja (opinia/rolka/paliwo).
export async function setAssignmentExtras(id: string, extras: { reviewGiven?: boolean; reelGiven?: boolean; reelLink?: string | null; fuelAmount?: number }): Promise<void> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (extras.reviewGiven !== undefined) patch.review_given = extras.reviewGiven;
  if (extras.reelGiven !== undefined) patch.reel_given = extras.reelGiven;
  if (extras.reelLink !== undefined) patch.reel_link = extras.reelLink?.trim() || null;
  if (extras.fuelAmount !== undefined) patch.fuel_amount = Math.max(0, Math.round((extras.fuelAmount || 0) * 100) / 100);
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from("job_assignments").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

// §pulpit Prośby pracowników o przypisanie (REQUESTED) — do sekcji „Wymaga uwagi" u szefa.
export interface PendingAssignmentRequest {
  assignmentId: string;
  jobId: string;
  reservationId: string | null;
  employeeName: string;
  title: string;
  eventDate: string | null;
}

export async function listPendingAssignmentRequests(): Promise<PendingAssignmentRequest[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_assignments")
    .select("id, employee:profiles!profile_id(full_name), job:jobs(id, title, event_date, reservation_id, reservation:reservations(customer:customers(name)))")
    .eq("status", "REQUESTED");
  interface Raw { id: string; employee: { full_name: string | null } | null; job: { id: string; title: string | null; event_date: string | null; reservation_id: string | null; reservation: { customer: { name: string | null } | null } | null } | null }
  const rows = (data ?? []) as unknown as Raw[];
  return rows
    .filter((r) => r.job)
    .map((r) => ({
      assignmentId: r.id,
      jobId: r.job!.id,
      reservationId: r.job!.reservation_id ?? null,
      employeeName: r.employee?.full_name?.trim() || "Pracownik",
      title: r.job!.reservation?.customer?.name ?? r.job!.title ?? "Realizacja",
      eventDate: r.job!.event_date ?? null,
    }));
}

// §pulpit Liczba zakończonych realizacji z nierozliczonym wynagrodzeniem (saldo „do wypłaty").
export async function countUnsettledDoneAssignments(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_assignments")
    .select("id, settled_at, status, job:jobs(status)")
    .eq("status", "APPROVED")
    .is("settled_at", null);
  const rows = (data ?? []) as unknown as { id: string; job: { status: string } | null }[];
  return rows.filter((r) => r.job?.status === "DONE").length;
}

export async function setAssignmentSettled(id: string, settled: boolean): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("job_assignments")
    .update({ settled_at: settled ? new Date().toISOString() : null, settled_by: settled ? (user?.id ?? null) : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
