"use server";
// Server Actions: checklista pakowania (§17) — generowanie i odhaczanie.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getJob } from "@/lib/data/jobs";
import { listAddons } from "@/lib/data/resources";
import { generateChecklist, toggleChecklistItem } from "@/lib/data/checklist";
import { buildChecklistTemplate } from "@/lib/domain/checklist";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać (docs/SUPABASE_SETUP.md).";

export async function generateChecklistAction(jobId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    const [job, addons] = await Promise.all([getJob(jobId), listAddons()]);
    const r = job?.reservation;
    const addonNames = (r?.addon_ids ?? [])
      .map((id) => addons.find((a) => a.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    const template = buildChecklistTemplate({
      tentName: r?.tent?.name,
      packageName: r?.package?.name,
      addonNames,
    });
    await generateChecklist(jobId, template);
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
