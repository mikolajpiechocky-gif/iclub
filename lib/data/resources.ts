// Warstwa danych: zasoby konfigurowalne (namioty, pakiety, dodatki).
// Odczyt przez Supabase; w TRYBIE DEMO zwraca dane przykładowe.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { TentRecord, PackageRecord, AddonRecord } from "./types";
import { DEMO_TENT_RECORDS, DEMO_PACKAGE_RECORDS, DEMO_ADDON_RECORDS } from "./demo-resources";
import { listAddonInventory } from "./inventory";

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

// §12 Katalog dodatków rezerwacji = pozycje magazynowe oznaczone „widoczna jako dodatek"
// (główne źródło), uzupełnione o legacy `addons` dla zgodności wstecznej istniejących
// rezerwacji. Cena dodatku = cena wynajmu pozycji magazynowej.
export async function listReservationAddons(): Promise<AddonRecord[]> {
  const [legacy, warehouse] = await Promise.all([listAddons(), listAddonInventory()]);
  const fromWarehouse: AddonRecord[] = warehouse.map((e, i) => ({
    id: e.id,
    code: e.code,
    name: e.name,
    price: e.rental_price ?? 0,
    active: true,
    sort: i,
  }));
  const seen = new Set(fromWarehouse.map((a) => a.id));
  return [...fromWarehouse, ...legacy.filter((a) => !seen.has(a.id))];
}

// --- Cennik (§51): edycja cen pakietów i dodatków. Zapis tylko OWNER (RLS). ---
export async function updatePackagePrice(id: string, base_price: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("packages").update({ base_price }).eq("id", id);
  if (error) throw new Error(error.message);
}

// §9.2 Standardowy czas montażu pakietu (minuty).
export async function updatePackageAssembly(id: string, assembly_minutes: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("packages").update({ assembly_minutes }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateAddonPrice(id: string, price: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("addons").update({ price }).eq("id", id);
  if (error) throw new Error(error.message);
}
