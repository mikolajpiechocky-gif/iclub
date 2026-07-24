"use server";
// Server Actions: checklista pakowania (§17) — generowanie i odhaczanie.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toggleChecklistItem } from "@/lib/data/checklist";
import { generateChecklistForJob } from "@/lib/data/checklist-gen";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać (docs/SUPABASE_SETUP.md).";

export async function generateChecklistAction(jobId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    await generateChecklistForJob(jobId);
    revalidatePath(`/field/${jobId}/checklist`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się wygenerować checklisty." };
  }
}

export async function toggleItemAction(id: string, jobId: string, done: boolean): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    await toggleChecklistItem(id, done);
    revalidatePath(`/field/${jobId}/checklist`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd." };
  }
}
