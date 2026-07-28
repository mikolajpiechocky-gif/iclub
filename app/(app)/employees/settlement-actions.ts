"use server";
// §24 Rozliczenia wypłat pracownika — oznaczanie realizacji jako rozliczonych (tylko szef).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { setAssignmentSettled, listEmployeeSettlements } from "@/lib/data/assignments";

export async function settleAssignmentAction(assignmentId: string, settled: boolean, profileId: string) {
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Tryb demo." };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false as const, error: "Tylko szef rozlicza wypłaty." };
  try {
    await setAssignmentSettled(assignmentId, settled);
    revalidatePath(`/employees/${profileId}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}

export async function settleAllForEmployeeAction(profileId: string) {
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Tryb demo." };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false as const, error: "Tylko szef." };
  try {
    const rows = await listEmployeeSettlements(profileId);
    for (const r of rows) if (!r.settledAt && r.amount > 0) await setAssignmentSettled(r.assignmentId, true);
    revalidatePath(`/employees/${profileId}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Nie udało się rozliczyć." };
  }
}
