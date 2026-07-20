// Warstwa danych: zasoby konfigurowalne (namioty, pakiety, dodatki).
// Odczyt przez Supabase; w TRYBIE DEMO zwraca dane przykładowe.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { TentRecord, PackageRecord, AddonRecord } from "./types";
import { DEMO_TENT_RECORDS, DEMO_PACKAGE_RECORDS, DEMO_ADDON_RECORDS } from "./demo-resources";

export async function listTents(): Promise<TentRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_TENT_RECORDS;
  const supabase = await createClient();
  const { data, error } = await supabase.from("tents").select("*").order("code");
  if (error) throw new Error(error.message);
  return (data ?? []) as TentRecord[];
}

export async function listPackages(): Promise<PackageRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_PACKAGE_RECORDS;
  const supabase = await createClient();
  const { data, error } = await supabase.from("packages").select("*").eq("active", true).order("sort");
  if (error) throw new Error(error.message);
  return (data ?? []) as PackageRecord[];
}

export async function listAddons(): Promise<AddonRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_ADDON_RECORDS;
  const supabase = await createClient();
  const { data, error } = await supabase.from("addons").select("*").eq("active", true).order("sort");
  if (error) throw new Error(error.message);
  return (data ?? []) as AddonRecord[];
}

// --- Cennik (§51): edycja cen pakietów i dodatków. Zapis tylko OWNER (RLS). ---
export async function updatePackagePrice(id: string, base_price: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("packages").update({ base_price }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateAddonPrice(id: string, price: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("addons").update({ price }).eq("id", id);
  if (error) throw new Error(error.message);
}
