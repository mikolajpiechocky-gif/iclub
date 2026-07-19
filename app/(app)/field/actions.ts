"use server";
// Server Action: zmiana statusu etapu realizacji (§19).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { setStageStatus } from "@/lib/data/jobs";
import type { StageStatus } from "@/lib/data/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function advanceStageAction(stageId: string, jobId: string, status: StageStatus): Promise<ActionResult> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Tryb demo: skonfiguruj Supabase, aby zapisywać postęp." };
  try {
    await setStageStatus(stageId, status);
    revalidatePath(`/field/${jobId}`);
    revalidatePath(`/jobs/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}
