"use server";
// Server Actions: status umowy (§44). Zarządza właściciel.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { setContractStatus } from "@/lib/data/contracts";
import type { ContractStatus } from "@/lib/data/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function setContractStatusAction(jobId: string, status: ContractStatus): Promise<ActionResult> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Tryb demo: skonfiguruj Supabase, aby zapisać (docs/SUPABASE_SETUP.md)." };
  const p = await getCurrentProfile();
  if (p?.role !== "OWNER") return { ok: false, error: "Tylko właściciel zarządza umowami." };
  try {
    await setContractStatus(jobId, status);
    revalidatePath(`/jobs/${jobId}/contract`);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd." };
  }
}
