"use server";
// Server Actions: zapis stawek pracownika (tylko OWNER).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { upsertEmployeeRate } from "@/lib/data/employees";
import { getCurrentProfile } from "@/lib/data/profiles";
import type { RateModel, IclubSettlementMode } from "@/lib/data/types";

export interface RateFormValues {
  rate_model: RateModel;
  hourly_rate: string;
  iclub_flat: string;
  far_bonus: string;
  gastro_bonus: string;
  review_bonus: string;
  reel_bonus: string;
  upsell_percent: string;
  iclub_settlement_mode: IclubSettlementMode;
  notes: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function toNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return isNaN(n) ? null : n;
}

export async function saveEmployeeRateAction(profileId: string, v: RateFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Tryb demo: aby zapisać stawki, skonfiguruj Supabase (docs/SUPABASE_SETUP.md)." };

  const profile = await getCurrentProfile();
  if (profile?.role !== "OWNER") return { ok: false, error: "Tylko szef może zmieniać stawki." };

  try {
    await upsertEmployeeRate(profileId, {
      rate_model: v.rate_model,
      hourly_rate: toNum(v.hourly_rate),
      iclub_flat: toNum(v.iclub_flat),
      far_bonus: toNum(v.far_bonus),
      gastro_bonus: toNum(v.gastro_bonus),
      review_bonus: toNum(v.review_bonus),
      reel_bonus: toNum(v.reel_bonus),
      upsell_percent: toNum(v.upsell_percent),
      iclub_settlement_mode: v.iclub_settlement_mode === "THRESHOLD" ? "THRESHOLD" : "FLAT",
      notes: v.notes.trim() || null,
    });
    revalidatePath("/employees");
    revalidatePath(`/employees/${profileId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać stawek." };
  }
}
