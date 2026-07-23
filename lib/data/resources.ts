// Warstwa danych: zasoby konfigurowalne (namioty, pakiety, dodatki).
// Odczyt przez Supabase; w TRYBIE DEMO zwraca dane przykładowe.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { TentRecord, TentStatus, PackageRecord, AddonRecord, ReservationAddon, PackageItemRecord } from "./types";
import { DEMO_TENT_RECORDS, DEMO_PACKAGE_RECORDS, DEMO_ADDON_RECORDS } from "./demo-resources";
import { listAddonInventory } from "./inventory";

export async function listTents(): Promise<TentRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_TENT_RECORDS;
  const supabase = await createClient();
  const { data, error } = await supabase.from("tents").select("*").order("code");
  if (error) throw new Error(error.message);
  return (data ?? []) as TentRecord[];
}

export interface TentInput {
  code: string;
  name: string;
  size: string | null;
  set_color: string | null;
  has_back_door: boolean;
  status: TentStatus;
  notes: string | null;
}

export async function getTent(id: string): Promise<TentRecord | null> {
  if (!isSupabaseConfigured()) return DEMO_TENT_RECORDS.find((t) => t.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("tents").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return (data as TentRecord) ?? null;
}

// Dodanie/edycja namiotu w magazynie. Zapis tylko Szef (RLS tents_write = is_owner()).
export async function createTent(input: TentInput): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tents").insert(input).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function updateTent(id: string, input: TentInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tents").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listPackages(): Promise<PackageRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_PACKAGE_RECORDS;
  const supabase = await createClient();
  const { data, error } = await supabase.from("packages").select("*").eq("active", true).order("sort");
  if (error) throw new Error(error.message);
  return (data ?? []) as PackageRecord[];
}

// Wszystkie pakiety (także nieaktywne) — do zarządzania w cenniku.
export async function listAllPackages(): Promise<PackageRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_PACKAGE_RECORDS;
  const supabase = await createClient();
  const { data, error } = await supabase.from("packages").select("*").order("sort");
  if (error) throw new Error(error.message);
  return (data ?? []) as PackageRecord[];
}

export async function getPackage(id: string): Promise<PackageRecord | null> {
  if (!isSupabaseConfigured()) return DEMO_PACKAGE_RECORDS.find((p) => p.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("packages").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return (data as PackageRecord) ?? null;
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
export async function listReservationAddons(): Promise<ReservationAddon[]> {
  const [legacy, warehouse] = await Promise.all([listAddons(), listAddonInventory()]);
  const fromWarehouse: ReservationAddon[] = warehouse.map((e) => ({
    id: e.id,
    code: e.code,
    name: e.name,
    price: e.rental_price ?? 0,
    photo_url: e.photo_url,
    available: e.quantity,
  }));
  const seen = new Set(fromWarehouse.map((a) => a.id));
  const fromLegacy: ReservationAddon[] = legacy
    .filter((a) => !seen.has(a.id))
    .map((a) => ({ id: a.id, code: a.code, name: a.name, price: a.price, photo_url: null, available: null }));
  return [...fromWarehouse, ...fromLegacy];
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

// §11 Aktywność pakietu (aktywny/nieaktywny — nieaktywne znikają z nowych rezerwacji).
export async function updatePackageActive(id: string, active: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("packages").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
}

// §11.1 Skład pakietu (pozycje magazynowe zawarte w pakiecie).
export async function listPackageItems(packageId: string): Promise<PackageItemRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("package_items")
    .select("*, equipment:equipment(id, name, unit)")
    .eq("package_id", packageId)
    .order("sort");
  if (error) return [];
  return (data ?? []) as unknown as PackageItemRecord[];
}

export async function listAllPackageItems(): Promise<PackageItemRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("package_items")
    .select("*, equipment:equipment(id, name, unit)")
    .order("sort");
  if (error) return [];
  return (data ?? []) as unknown as PackageItemRecord[];
}

// Zastępuje skład pakietu. Najpierw upsert nowych pozycji, potem usunięcie tych spoza
// nowego zestawu — dzięki temu awaria w połowie NIE zostawia pustego składu (co zaburzyłoby
// rozliczanie nadwyżki i dostępność). Zapis tylko Szef (RLS).
export async function replacePackageItems(packageId: string, items: { equipment_id: string; quantity: number }[]): Promise<void> {
  const supabase = await createClient();
  const rows = items.map((it, i) => ({ package_id: packageId, equipment_id: it.equipment_id, quantity: Math.max(1, Math.round(it.quantity) || 1), sort: i }));
  if (rows.length) {
    const { error: upErr } = await supabase.from("package_items").upsert(rows, { onConflict: "package_id,equipment_id" });
    if (upErr) throw new Error(upErr.message);
  }
  const keep = rows.map((r) => r.equipment_id);
  let del = supabase.from("package_items").delete().eq("package_id", packageId);
  if (keep.length) del = del.not("equipment_id", "in", `(${keep.join(",")})`);
  const { error: delErr } = await del;
  if (delErr) throw new Error(delErr.message);
}

export async function updateAddonPrice(id: string, price: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("addons").update({ price }).eq("id", id);
  if (error) throw new Error(error.message);
}
