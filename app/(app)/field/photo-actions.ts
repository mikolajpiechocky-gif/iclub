"use server";
// Server Action: zapis metadanych zdjęcia realizacji po wgraniu pliku do Storage.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createJobPhoto } from "@/lib/data/photos";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createJobPhotoAction(jobId: string, path: string, caption?: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Tryb demo: skonfiguruj Supabase, aby zapisać zdjęcie." };
  if (!path.trim()) return { ok: false, error: "Brak ścieżki pliku." };
  try {
    await createJobPhoto(jobId, path, caption?.trim() || null);
    revalidatePath(`/field/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać zdjęcia." };
  }
}
