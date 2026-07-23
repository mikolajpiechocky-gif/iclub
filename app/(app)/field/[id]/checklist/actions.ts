"use server";
// Server Actions: checklista pakowania (§17) — generowanie i odhaczanie.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getJob } from "@/lib/data/jobs";
import { listAddons } from "@/lib/data/resources";
import { generateChecklist, toggleChecklistItem } from "@/lib/data/checklist";
import { buildChecklistTemplate } from "@/lib/domain/checklist";
import { getEventWeather } from "@/lib/integrations/weather";

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
    // §41 Ogrzewanie → nagrzewnica HT-01 na checkliście.
    if (r?.heating) addonNames.push("Nagrzewnica HT-01");
    // §41 Wentylacja dopina się automatycznie, gdy dla realizacji jest alert temperatury.
    try {
      if (r?.location && r?.event_date) {
        const w = await getEventWeather(r.location, r.event_date);
        if (w?.warnings.some((x) => x.kind === "heat")) addonNames.push("Wentylacja / wentylator");
      }
    } catch { /* pogoda opcjonalna — pomijamy przy braku danych */ }
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
