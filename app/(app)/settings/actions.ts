"use server";
// Server Action: zapis ustawień aplikacji (§51). Tylko OWNER.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { updateSettings, getSettings, type AppSettings } from "@/lib/data/settings";

export interface SettingsFormValues {
  base_address: string;
  fuel_price_petrol: string;
  fuel_price_diesel: string;
  fuel_price_lpg: string;
  amortization_per_km: string;
  iclub_hours: string;
  vat_rate: string;
  iclub_hourly_rate: string;
  iclub_month_threshold: string;
  iclub_flat_rate: string;
  assembly_buffer_minutes: string;
  assembly_addon_minutes: string;
  assembly_gastro_minutes: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisać ustawienia.";

function num(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return isNaN(n) ? null : n;
}

const NUMERIC_FIELDS: (keyof SettingsFormValues)[] = [
  "fuel_price_petrol", "fuel_price_diesel", "fuel_price_lpg", "amortization_per_km", "iclub_hours", "vat_rate",
  "iclub_hourly_rate", "iclub_month_threshold", "iclub_flat_rate",
  "assembly_buffer_minutes", "assembly_addon_minutes", "assembly_gastro_minutes",
];

export async function updateSettingsAction(v: SettingsFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const p = await getCurrentProfile();
  if (p?.role !== "OWNER") return { ok: false, error: "Tylko szef zmienia ustawienia." };

  const fieldErrors: Record<string, string> = {};
  const base = v.base_address.trim();
  if (!base) fieldErrors.base_address = "Podaj adres bazy.";

  const parsed: Record<string, number> = {};
  for (const key of NUMERIC_FIELDS) {
    const n = num(v[key]);
    if (n == null || n < 0) fieldErrors[key] = "Podaj poprawną liczbę (≥ 0).";
    else parsed[key] = n;
  }
  if (v.vat_rate && Number(v.vat_rate.replace(",", ".")) > 100) fieldErrors.vat_rate = "VAT nie może przekraczać 100%.";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const input: AppSettings = {
    base_address: base,
    fuel_price_petrol: parsed.fuel_price_petrol,
    fuel_price_diesel: parsed.fuel_price_diesel,
    fuel_price_lpg: parsed.fuel_price_lpg,
    amortization_per_km: parsed.amortization_per_km,
    iclub_hours: parsed.iclub_hours,
    vat_rate: parsed.vat_rate,
    iclub_hourly_rate: parsed.iclub_hourly_rate,
    iclub_month_threshold: parsed.iclub_month_threshold,
    iclub_flat_rate: parsed.iclub_flat_rate,
    assembly_buffer_minutes: parsed.assembly_buffer_minutes,
    assembly_addon_minutes: parsed.assembly_addon_minutes,
    assembly_gastro_minutes: parsed.assembly_gastro_minutes,
  };
  // Odśwież znacznik przypomnienia tylko, gdy realnie zmieniono ceny paliwa.
  const current = await getSettings();
  const fuelChanged =
    current.fuel_price_petrol !== input.fuel_price_petrol ||
    current.fuel_price_diesel !== input.fuel_price_diesel ||
    current.fuel_price_lpg !== input.fuel_price_lpg;
  try {
    await updateSettings(input, fuelChanged);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}
