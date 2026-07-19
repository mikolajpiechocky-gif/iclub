"use server";
// Server Actions: przypisania pracowników do zlecenia + bonus właściciela (§9, §10).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { assignEmployee, removeAssignment, setAssignmentLead, setJobOwnerBonus } from "@/lib/data/assignments";
import { getJob } from "@/lib/data/jobs";
import { createNotification } from "@/lib/data/notifications";

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

export async function selfClaimAction(jobId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const p = await getCurrentProfile();
  if (!p) return { ok: false, error: "Zaloguj się." };
  try {
    await assignEmployee(jobId, p.id);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się podjąć zlecenia." };
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
