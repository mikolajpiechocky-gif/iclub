// Warstwa danych: magazyn (§17) — pełny CRUD pozycji + audyt każdej zmiany (§17.3).
// Odczyt/zapis Supabase; w TRYBIE DEMO zwraca dane przykładowe (bez zapisu).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { EquipmentRecord, EquipmentStatus, InventoryAuditRecord } from "./types";

export interface InventoryInput {
  code: string;
  name: string;
  category: string | null;
  quantity: number;
  tracking: string; // QUANTITY | INDIVIDUAL
  unit: string | null;
  location: string | null;
  set_number: string | null;
  unit_cost: number | null;
  purchase_date: string | null;
  supplier: string | null;
  rental_price: number | null;
  replacement_value: number | null;
  status: EquipmentStatus;
  is_rentable: boolean;
  is_addon: boolean;
  internal_only: boolean;
  notes: string | null;
  photo_url: string | null;
}

// Pola śledzone w audycie — z etykietami PL (dla czytelnej historii zmian).
const AUDIT_FIELDS: { key: keyof InventoryInput; label: string }[] = [
  { key: "code", label: "Kod" },
  { key: "name", label: "Nazwa" },
  { key: "category", label: "Kategoria" },
  { key: "quantity", label: "Ilość" },
  { key: "tracking", label: "Śledzenie" },
  { key: "unit", label: "Jednostka" },
  { key: "location", label: "Lokalizacja" },
  { key: "set_number", label: "Numer zestawu" },
  { key: "unit_cost", label: "Cena zakupu" },
  { key: "purchase_date", label: "Data zakupu" },
  { key: "supplier", label: "Dostawca" },
  { key: "rental_price", label: "Cena wynajmu" },
  { key: "replacement_value", label: "Wartość odtworzeniowa" },
  { key: "status", label: "Status" },
  { key: "is_rentable", label: "Możliwa do wynajęcia" },
  { key: "is_addon", label: "Widoczna jako dodatek" },
  { key: "internal_only", label: "Tylko wewnętrzne" },
  { key: "notes", label: "Notatki" },
  { key: "photo_url", label: "Zdjęcie" },
];

const DEMO_INVENTORY: EquipmentRecord[] = [
  { id: "demo-eq1", code: "KRZ-100", name: "Krzesła bankietowe", category: "Meble", quantity: 100, tracking: "QUANTITY", unit_cost: 45, status: "AVAILABLE", notes: null, active: true, unit: "szt.", location: "Regał A1", set_number: null, purchase_date: null, supplier: null, rental_price: 5, replacement_value: 60, is_rentable: true, is_addon: true, internal_only: false, photo_url: null },
  { id: "demo-eq2", code: "STO-20", name: "Stoły składane", category: "Meble", quantity: 20, tracking: "QUANTITY", unit_cost: 180, status: "AVAILABLE", notes: null, active: true, unit: "szt.", location: "Regał A2", set_number: null, purchase_date: null, supplier: null, rental_price: 20, replacement_value: 240, is_rentable: true, is_addon: true, internal_only: false, photo_url: null },
];

function toRow(input: InventoryInput): Record<string, unknown> {
  return { ...input };
}

async function getActor(supabase: Awaited<ReturnType<typeof createClient>>): Promise<{ id: string | null; name: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { id: null, name: null };
  // actor ma FK → profiles(id); bez wiersza w profiles zostaw actor=null (nie łam FK).
  const { data } = await supabase.from("profiles").select("id, full_name").eq("id", user.id).maybeSingle();
  if (!data) return { id: null, name: null };
  return { id: user.id, name: (data.full_name as string | null) ?? null };
}

export async function logChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  item_id: string | null,
  item_name: string | null,
  action: InventoryAuditRecord["action"],
  changes: InventoryAuditRecord["changes"],
): Promise<void> {
  const who = await getActor(supabase);
  // Audyt nie może wywrócić operacji biznesowej, ale błąd musi zostawić ślad diagnostyczny.
  const { error } = await supabase.from("inventory_audit").insert({
    item_id, item_name, action, changes,
    actor: who.id, actor_name: who.name,
  });
  if (error) console.error("[inventory_audit] nie zapisano wpisu audytu:", error.message);
}

// Pola liczbowe — PostgREST zwraca numeric jako STRING ("45.00"); normalizujemy
// obie strony do liczby, aby diff nie generował fałszywych zmian (np. "45.00" vs 45).
const NUMERIC_KEYS = new Set<keyof InventoryInput>(["quantity", "unit_cost", "rental_price", "replacement_value"]);
function normVal(key: keyof InventoryInput, v: unknown): unknown {
  // Zdjęcie: audytujemy tylko obecność (nie zapisujemy w logu ogromnego data URL).
  if (key === "photo_url") return v ? "zdjęcie" : null;
  if (v === null || v === undefined || v === "") return null;
  if (NUMERIC_KEYS.has(key)) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return v;
}

// Różnica pól old→new (tylko realnie zmienione), do zapisu w audycie.
function diff(old: EquipmentRecord, next: InventoryInput): InventoryAuditRecord["changes"] {
  const out: Record<string, { old: unknown; new: unknown }> = {};
  for (const f of AUDIT_FIELDS) {
    const b = normVal(f.key, (old as unknown as Record<string, unknown>)[f.key]);
    const a = normVal(f.key, (next as unknown as Record<string, unknown>)[f.key]);
    if (b !== a) out[f.label] = { old: b, new: a };
  }
  return Object.keys(out).length ? out : null;
}

export async function listInventory(includeInactive = false): Promise<EquipmentRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_INVENTORY;
  const supabase = await createClient();
  let q = supabase.from("equipment").select("*").order("category", { nullsFirst: false }).order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EquipmentRecord[];
}

export async function getInventoryItem(id: string): Promise<EquipmentRecord | null> {
  if (!isSupabaseConfigured()) return DEMO_INVENTORY.find((x) => x.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("equipment").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return (data as unknown as EquipmentRecord) ?? null;
}

// Aktywne pozycje oznaczone jako dodatek (§12: dodatki z magazynu).
export async function listAddonInventory(): Promise<EquipmentRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_INVENTORY.filter((x) => x.is_addon);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("active", true)
    .eq("is_addon", true)
    .eq("internal_only", false) // §12.1 nie oferuj klientowi pozycji „tylko wewnętrznych"
    .order("name");
  if (error) return [];
  return (data ?? []) as unknown as EquipmentRecord[];
}

export async function createInventoryItem(input: InventoryInput): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("equipment").insert(toRow(input)).select("id").single();
  if (error) throw new Error(error.message);
  const id = (data as { id: string }).id;
  await logChange(supabase, id, input.name, "create", null);
  return { id };
}

export async function updateInventoryItem(id: string, input: InventoryInput): Promise<void> {
  const supabase = await createClient();
  const before = await getInventoryItem(id);
  const { error } = await supabase.from("equipment").update(toRow(input)).eq("id", id);
  if (error) throw new Error(error.message);
  await logChange(supabase, id, input.name, "update", before ? diff(before, input) : null);
}

// §17 „wycofanie" pozycji (miękkie) + przywrócenie — audytowane.
export async function setInventoryActive(id: string, active: boolean): Promise<void> {
  const supabase = await createClient();
  const before = await getInventoryItem(id);
  const { error } = await supabase.from("equipment").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  await logChange(supabase, id, before?.name ?? null, active ? "restore" : "delete", {
    "Aktywna": { old: before?.active ?? null, new: active },
  });
}

export async function listInventoryAudit(itemId?: string, limit = 50): Promise<InventoryAuditRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  let q = supabase.from("inventory_audit").select("*").order("created_at", { ascending: false }).limit(limit);
  if (itemId) q = q.eq("item_id", itemId);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as unknown as InventoryAuditRecord[];
}
