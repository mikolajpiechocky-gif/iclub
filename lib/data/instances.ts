// §17.2 Konkretne egzemplarze sprzętu (numer seryjny, zdjęcie, stan, historia).
// Historia = wspólny audyt magazynowy (inventory_audit, przez logChange).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logChange } from "./inventory";
import type { EquipmentInstanceRecord, EquipmentStatus, InventoryAuditRecord } from "./types";

export interface InstanceInput {
  serial_number: string | null;
  label: string | null;
  status: EquipmentStatus;
  photo_url: string | null;
  notes: string | null;
}

const AUDIT_FIELDS: { key: keyof InstanceInput; label: string }[] = [
  { key: "serial_number", label: "Numer seryjny" },
  { key: "label", label: "Oznaczenie" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notatki" },
  { key: "photo_url", label: "Zdjęcie" },
];

const nameOf = (i: { label: string | null; serial_number: string | null }) => i.label || i.serial_number || "Egzemplarz";

function diff(old: EquipmentInstanceRecord, next: InstanceInput): InventoryAuditRecord["changes"] {
  const out: Record<string, { old: unknown; new: unknown }> = {};
  for (const f of AUDIT_FIELDS) {
    const b = f.key === "photo_url" ? ((old.photo_url ? "zdjęcie" : null)) : ((old as unknown as Record<string, unknown>)[f.key] ?? null);
    const a = f.key === "photo_url" ? ((next.photo_url ? "zdjęcie" : null)) : ((next as unknown as Record<string, unknown>)[f.key] ?? null);
    if (b !== a) out[f.label] = { old: b, new: a };
  }
  return Object.keys(out).length ? out : null;
}

export async function listInstances(equipmentId: string): Promise<EquipmentInstanceRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment_instances")
    .select("id, equipment_id, serial_number, label, status, photo_url, notes, active")
    .eq("equipment_id", equipmentId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as unknown as EquipmentInstanceRecord[];
}

export async function getInstance(id: string): Promise<EquipmentInstanceRecord | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("equipment_instances").select("id, equipment_id, serial_number, label, status, photo_url, notes, active").eq("id", id).maybeSingle();
  return (data as unknown as EquipmentInstanceRecord) ?? null;
}

export async function createInstance(equipmentId: string, input: InstanceInput): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("equipment_instances").insert({ equipment_id: equipmentId, ...input }).select("id").single();
  if (error) throw new Error(error.message);
  const id = (data as { id: string }).id;
  // Historia pod ID pozycji nadrzędnej — żeby była widoczna w „Historia zmian" pozycji.
  await logChange(supabase, equipmentId, `Egzemplarz: ${nameOf(input)}`, "create", null);
  return { id };
}

export async function updateInstance(id: string, input: InstanceInput): Promise<void> {
  const supabase = await createClient();
  const before = await getInstance(id);
  const { error } = await supabase.from("equipment_instances").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  await logChange(supabase, before?.equipment_id ?? null, `Egzemplarz: ${nameOf(input)}`, "update", before ? diff(before, input) : null);
}

export async function setInstanceActive(id: string, active: boolean): Promise<void> {
  const supabase = await createClient();
  const before = await getInstance(id);
  const { error } = await supabase.from("equipment_instances").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  await logChange(supabase, before?.equipment_id ?? null, `Egzemplarz: ${before ? nameOf(before) : ""}`, active ? "restore" : "delete", { "Aktywny": { old: before?.active ?? null, new: active } });
}
