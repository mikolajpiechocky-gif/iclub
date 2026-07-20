"use server";
// Server Action: zapis cennika pakietów i dodatków (§51). Tylko OWNER.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { updatePackagePrice, updateAddonPrice } from "@/lib/data/resources";

export interface PriceRow {
  id: string;
  price: string;
}
export interface PricingFormValues {
  packages: PriceRow[];
  addons: PriceRow[];
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisać cennik.";

function num(s: string): number | null {
  const t = s.trim();
  if (!t) return 0;
  const n = Number(t.replace(",", "."));
  return isNaN(n) ? null : n;
}

export async function updatePricingAction(v: PricingFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const p = await getCurrentProfile();
  if (p?.role !== "OWNER") return { ok: false, error: "Tylko właściciel edytuje cennik." };

  // Walidacja wszystkich kwot przed jakimkolwiek zapisem.
  const fieldErrors: Record<string, string> = {};
  const parsed: { id: string; price: number; kind: "pkg" | "add" }[] = [];
  for (const row of v.packages) {
    const n = num(row.price);
    if (n == null || n < 0) fieldErrors[row.id] = "Podaj kwotę ≥ 0.";
    else parsed.push({ id: row.id, price: n, kind: "pkg" });
  }
  for (const row of v.addons) {
    const n = num(row.price);
    if (n == null || n < 0) fieldErrors[row.id] = "Podaj kwotę ≥ 0.";
    else parsed.push({ id: row.id, price: n, kind: "add" });
  }
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  try {
    for (const row of parsed) {
      if (row.kind === "pkg") await updatePackagePrice(row.id, row.price);
      else await updateAddonPrice(row.id, row.price);
    }
    revalidatePath("/pricing");
    revalidatePath("/reservations/new");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}
