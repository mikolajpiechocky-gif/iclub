"use server";
// Server Action: zapis cennika pakietów i dodatków (§51). Tylko OWNER.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { updatePackagePrice, updatePackageAssembly, updatePackageActive, updateAddonPrice } from "@/lib/data/resources";

export interface PackagePriceRow {
  id: string;
  priceSmall: string; // §cennik cena dla małego namiotu
  priceBig: string;   // §cennik cena dla dużego namiotu
  assembly?: string;  // §9.2 czas montażu (minuty)
  active?: boolean;   // §11 aktywność
}
export interface AddonPriceRow {
  id: string;
  price: string;
}
export interface PricingFormValues {
  packages: PackagePriceRow[];
  addons: AddonPriceRow[];
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
  if (p?.role !== "OWNER") return { ok: false, error: "Tylko szef edytuje cennik." };

  // Walidacja wszystkich kwot przed jakimkolwiek zapisem.
  const fieldErrors: Record<string, string> = {};
  const pkgParsed: { id: string; small: number; big: number; assembly: number | null; active: boolean | null }[] = [];
  const addParsed: { id: string; price: number }[] = [];
  for (const row of v.packages) {
    const s = num(row.priceSmall);
    const b = num(row.priceBig);
    const a = row.assembly != null ? num(row.assembly) : null;
    if (s == null || s < 0 || b == null || b < 0) fieldErrors[row.id] = "Podaj obie kwoty ≥ 0.";
    else if (a != null && (a < 0 || !Number.isInteger(a))) fieldErrors[row.id] = "Czas montażu: liczba całkowita minut ≥ 0.";
    else pkgParsed.push({ id: row.id, small: s, big: b, assembly: a, active: row.active ?? null });
  }
  for (const row of v.addons) {
    const n = num(row.price);
    if (n == null || n < 0) fieldErrors[row.id] = "Podaj kwotę ≥ 0.";
    else addParsed.push({ id: row.id, price: n });
  }
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  try {
    for (const row of pkgParsed) {
      await updatePackagePrice(row.id, row.small, row.big);
      if (row.assembly != null) await updatePackageAssembly(row.id, row.assembly);
      if (row.active != null) await updatePackageActive(row.id, row.active);
    }
    for (const row of addParsed) await updateAddonPrice(row.id, row.price);
    revalidatePath("/pricing");
    revalidatePath("/reservations/new");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}
