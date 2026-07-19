"use server";
// Server Actions: dostępność pracownika (§11).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { addAvailability, removeAvailability } from "@/lib/data/availability";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać (docs/SUPABASE_SETUP.md).";

export async function addAvailabilityAction(start: string, end: string, note: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const p = await getCurrentProfile();
  if (!p) return { ok: false, error: "Zaloguj się." };
  if (!start) return { ok: false, error: "Podaj datę początkową." };
  const e = end || start;
  if (e < start) return { ok: false, error: "Data końcowa nie może być przed początkową." };
  try {
    await addAvailability(p.id, start, e, note.trim() || null);
    revalidatePath("/availability");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Nie udało się zapisać." };
  }
}

export async function removeAvailabilityAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    await removeAvailability(id);
    revalidatePath("/availability");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Błąd." };
  }
}
