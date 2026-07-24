"use server";
// Server Actions: koszty (§45). Weryfikacja tylko przez OWNER.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { createCost, setCostStatus } from "@/lib/data/costs";

export interface CostFormValues {
  job_id: string;
  category: string;
  amount: string;
  spent_on: string;
  note: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać (docs/SUPABASE_SETUP.md).";

function toNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return isNaN(n) ? null : n;
}

export async function createCostAction(v: CostFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const amount = toNum(v.amount);
  if (amount == null || amount < 0) return { ok: false, fieldErrors: { amount: "Podaj poprawną kwotę." } };
  try {
    await createCost({
      job_id: v.job_id || null,
      category: v.category || "Inne",
      amount,
      spent_on: v.spent_on || null,
      note: v.note.trim() || null,
    });
    revalidatePath("/costs");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać kosztu." };
  }
}

export async function verifyCostAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const p = await getCurrentProfile();
  if (p?.role !== "OWNER") return { ok: false, error: "Tylko szef weryfikuje koszty." };
  try {
    await setCostStatus(id, "VERIFIED");
    revalidatePath("/costs");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd." };
  }
}

// §II.7 Odrzucenie kosztu (Szef). Odrzucone nie wliczają się do rentowności realizacji.
export async function rejectCostAction(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const p = await getCurrentProfile();
  if (p?.role !== "OWNER") return { ok: false, error: "Tylko szef odrzuca koszty." };
  try {
    await setCostStatus(id, "REJECTED");
    revalidatePath("/costs");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd." };
  }
}
