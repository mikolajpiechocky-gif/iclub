"use server";
// Server Action: zapis podpisu klienta (§21).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { saveSignature } from "@/lib/data/signatures";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function saveSignatureAction(jobId: string, dataUrl: string, signerName: string): Promise<ActionResult> {
  if (!isSupabaseConfigured())
    return { ok: false, error: "Tryb demo: skonfiguruj Supabase, aby zapisać podpis (docs/SUPABASE_SETUP.md)." };
  if (!dataUrl || dataUrl.length < 100) return { ok: false, error: "Podpis jest pusty." };
  try {
    await saveSignature(jobId, dataUrl, signerName.trim() || null);
    revalidatePath(`/field/${jobId}/signature`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać podpisu." };
  }
}
