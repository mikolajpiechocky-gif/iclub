"use server";
// §11.1 Zapis składu pakietu (pozycje magazynowe zawarte w pakiecie). Tylko Szef.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { replacePackageItems } from "@/lib/data/resources";

export interface CompositionItem {
  equipment_id: string;
  quantity: number;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function savePackageItemsAction(packageId: string, items: CompositionItem[]): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Tryb demo: skonfiguruj Supabase, aby zapisać skład." };
  const p = await getCurrentProfile();
  if (p?.role !== "OWNER") return { ok: false, error: "Tylko szef edytuje skład pakietów." };
  const clean = items
    .filter((it) => it.equipment_id)
    .map((it) => ({ equipment_id: it.equipment_id, quantity: Math.max(1, Math.round(it.quantity) || 1) }));
  try {
    await replacePackageItems(packageId, clean);
    revalidatePath("/pricing");
    revalidatePath("/reservations");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać składu." };
  }
}
