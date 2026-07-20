// Warstwa danych: ustawienia aplikacji (§51). Odczyt/zapis Supabase; w TRYBIE
// DEMO oraz gdy wiersz jeszcze nie istnieje — zwraca wartości domyślne.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface AppSettings {
  base_address: string;
  fuel_price_petrol: number;
  fuel_price_diesel: number;
  fuel_price_lpg: number;
  amortization_per_km: number;
  iclub_hours: number;
  vat_rate: number;
}

// Wartości startowe (seed migracji 0017/0019). Jedyne miejsce z domyślnymi liczbami.
export const DEFAULT_SETTINGS: AppSettings = {
  base_address: "Południowa 9, Dopiewo",
  fuel_price_petrol: 6.5,
  fuel_price_diesel: 6.5,
  fuel_price_lpg: 3.2,
  amortization_per_km: 0.05,
  iclub_hours: 8,
  vat_rate: 23,
};

const num = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export async function getSettings(): Promise<AppSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("base_address, fuel_price_petrol, fuel_price_diesel, fuel_price_lpg, amortization_per_km, iclub_hours, vat_rate")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return {
    base_address: data.base_address || DEFAULT_SETTINGS.base_address,
    fuel_price_petrol: num(data.fuel_price_petrol, DEFAULT_SETTINGS.fuel_price_petrol),
    fuel_price_diesel: num(data.fuel_price_diesel, DEFAULT_SETTINGS.fuel_price_diesel),
    fuel_price_lpg: num(data.fuel_price_lpg, DEFAULT_SETTINGS.fuel_price_lpg),
    amortization_per_km: num(data.amortization_per_km, DEFAULT_SETTINGS.amortization_per_km),
    iclub_hours: num(data.iclub_hours, DEFAULT_SETTINGS.iclub_hours),
    vat_rate: num(data.vat_rate, DEFAULT_SETTINGS.vat_rate),
  };
}

// Zapis: upsert singletona (id=true). RLS wymusza rolę OWNER.
// bumpFuel = true, gdy zmieniono ceny paliwa — odświeża znacznik przypomnienia.
export async function updateSettings(input: AppSettings, bumpFuel = false): Promise<void> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { id: true, ...input };
  if (bumpFuel) patch.fuel_updated_at = new Date().toISOString();
  const { error } = await supabase.from("app_settings").upsert(patch);
  if (error) throw new Error(error.message);
}

// Czy minęły 2 tygodnie od ostatniej aktualizacji cen paliwa (przypomnienie).
export async function fuelReminderDue(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("fuel_updated_at").eq("id", true).maybeSingle();
  if (!data?.fuel_updated_at) return false;
  const days = (Date.now() - new Date(data.fuel_updated_at as string).getTime()) / 86_400_000;
  return days >= 14;
}
