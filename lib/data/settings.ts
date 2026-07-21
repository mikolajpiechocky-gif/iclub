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
  // §19 Reguły rozliczenia realizacji iClub (konfigurowalne — bez kodowania na stałe).
  iclub_hourly_rate: number;    // stawka „czasu wolnego" (zł/h), np. 32,40
  iclub_month_threshold: number; // liczba pierwszych realizacji w miesiącu = czas wolny
  iclub_flat_rate: number;      // ryczałt za realizację powyżej progu (zł), np. 500
  // §9.3 Bufory do sugerowanej godziny montażu (minuty)
  assembly_buffer_minutes: number;  // bufor bezpieczeństwa
  assembly_addon_minutes: number;   // dodatkowy czas na każdy dodatek
  assembly_gastro_minutes: number;  // dodatkowy czas na namiot gastronomiczny
}

// Wartości startowe (seed migracji 0017/0019/0033). Jedyne miejsce z domyślnymi liczbami.
export const DEFAULT_SETTINGS: AppSettings = {
  base_address: "Południowa 9, Dopiewo",
  fuel_price_petrol: 6.5,
  fuel_price_diesel: 6.5,
  fuel_price_lpg: 3.2,
  amortization_per_km: 0.05,
  iclub_hours: 8,
  vat_rate: 23,
  iclub_hourly_rate: 32.4,
  iclub_month_threshold: 4,
  iclub_flat_rate: 500,
  assembly_buffer_minutes: 30,
  assembly_addon_minutes: 10,
  assembly_gastro_minutes: 60,
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
    .select("base_address, fuel_price_petrol, fuel_price_diesel, fuel_price_lpg, amortization_per_km, iclub_hours, vat_rate, iclub_hourly_rate, iclub_month_threshold, iclub_flat_rate, assembly_buffer_minutes, assembly_addon_minutes, assembly_gastro_minutes")
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
    iclub_hourly_rate: num(data.iclub_hourly_rate, DEFAULT_SETTINGS.iclub_hourly_rate),
    iclub_month_threshold: num(data.iclub_month_threshold, DEFAULT_SETTINGS.iclub_month_threshold),
    iclub_flat_rate: num(data.iclub_flat_rate, DEFAULT_SETTINGS.iclub_flat_rate),
    assembly_buffer_minutes: num(data.assembly_buffer_minutes, DEFAULT_SETTINGS.assembly_buffer_minutes),
    assembly_addon_minutes: num(data.assembly_addon_minutes, DEFAULT_SETTINGS.assembly_addon_minutes),
    assembly_gastro_minutes: num(data.assembly_gastro_minutes, DEFAULT_SETTINGS.assembly_gastro_minutes),
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
