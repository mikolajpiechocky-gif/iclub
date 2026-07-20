"use server";
// Server Actions: przypisania pracowników do zlecenia + bonus właściciela (§9, §10).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { assignEmployee, approveAssignment, removeAssignment, setAssignmentLead, setJobOwnerBonus } from "@/lib/data/assignments";
import { getJob } from "@/lib/data/jobs";
import { listOwnerIds } from "@/lib/data/profiles";
import { createNotification } from "@/lib/data/notifications";

function jobLabel(job: Awaited<ReturnType<typeof getJob>>): string {
  return job?.reservation?.customer?.name ?? job?.title ?? "zlecenie";
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać (docs/SUPABASE_SETUP.md).";

async function ownerError(): Promise<string | null> {
  const p = await getCurrentProfile();
  return p?.role === "OWNER" ? null : "Tylko właściciel może wykonać tę akcję.";
}

export async function assignEmployeeAction(jobId: string, profileId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const err = await ownerError();
  if (err) return { ok: false, error: err };
  if (!profileId) return { ok: false, error: "Wybierz pracownika." };
  try {
    await assignEmployee(jobId, profileId);
    const job = await getJob(jobId);
    const label = job?.reservation?.customer?.name ?? job?.title ?? "zlecenie";
    await createNotification(profileId, "Przypisano Cię do realizacji", `Zlecenie: ${label}${job?.event_date ? " · " + job.event_date : ""}`, "ASSIGNMENT", jobId);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się przypisać." };
  }
}

export async function removeAssignmentAction(id: string, jobId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const err = await ownerError();
  if (err) return { ok: false, error: err };
  try {
    await removeAssignment(id);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się usunąć." };
  }
}

export async function toggleLeadAction(id: string, jobId: string, isLead: boolean): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const err = await ownerError();
  if (err) return { ok: false, error: err };
  try {
    await setAssignmentLead(id, isLead);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd." };
  }
}

// Pracownik PROSI o przypisanie (status REQUESTED). Właściciel musi zaakceptować.
export async function selfClaimAction(jobId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const p = await getCurrentProfile();
  if (!p) return { ok: false, error: "Zaloguj się." };
  try {
    await assignEmployee(jobId, p.id, false, "REQUESTED");
    const job = await getJob(jobId);
    const owners = await listOwnerIds();
    const who = p.full_name?.trim() || "Pracownik";
    await Promise.all(
      owners.map((oid) =>
        createNotification(oid, "Prośba o przypisanie", `${who} prosi o przypisanie: ${jobLabel(job)}${job?.event_date ? " · " + job.event_date : ""}`, "ASSIGNMENT_REQUEST", jobId),
      ),
    );
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się wysłać prośby." };
  }
}

// Właściciel akceptuje prośbę pracownika o przypisanie.
export async function approveAssignmentAction(id: string, jobId: string, profileId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const err = await ownerError();
  if (err) return { ok: false, error: err };
  try {
    const approved = await approveAssignment(id);
    if (approved) {
      const job = await getJob(jobId);
      await createNotification(profileId, "Przypisanie zaakceptowane", `Właściciel zaakceptował Twoje przypisanie: ${jobLabel(job)}${job?.event_date ? " · " + job.event_date : ""}`, "ASSIGNMENT", jobId);
    }
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zaakceptować." };
  }
}

// Właściciel odrzuca prośbę (usuwa ją) i powiadamia pracownika.
export async function rejectAssignmentAction(id: string, jobId: string, profileId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const err = await ownerError();
  if (err) return { ok: false, error: err };
  try {
    const removed = await removeAssignment(id);
    if (removed) {
      const job = await getJob(jobId);
      await createNotification(profileId, "Prośba o przypisanie odrzucona", `Zlecenie: ${jobLabel(job)}`, "ASSIGNMENT", jobId);
    }
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się odrzucić." };
  }
}

// Pracownik wycofuje własną, nieakceptowaną jeszcze prośbę (RLS: tylko REQUESTED, own).
export async function withdrawRequestAction(id: string, jobId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const p = await getCurrentProfile();
  if (!p) return { ok: false, error: "Zaloguj się." };
  try {
    await removeAssignment(id);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się wycofać prośby." };
  }
}

export async function setOwnerBonusAction(jobId: string, amount: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const err = await ownerError();
  if (err) return { ok: false, error: err };
  const n = amount.trim() ? Number(amount.replace(",", ".")) : 0;
  if (isNaN(n)) return { ok: false, error: "Kwota musi być liczbą." };
  try {
    await setJobOwnerBonus(jobId, n);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd." };
  }
}
