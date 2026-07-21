"use server";
// Server Actions: magazyn (§17). Pełna edycja dla każdego zalogowanego pracownika
// (§17.3 pierwszy etap). Każda zmiana audytowana w warstwie danych.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createInventoryItem, updateInventoryItem, setInventoryActive, getInventoryItem, type InventoryInput } from "@/lib/data/inventory";
import type { EquipmentStatus } from "@/lib/data/types";

export interface InventoryFormValues {
  code: string;
  name: string;
  category: string;
  quantity: string;
  tracking: string;
  unit: string;
  location: string;
  set_number: string;
  unit_cost: string;
  purchase_date: string;
  supplier: string;
  rental_price: string;
  replacement_value: string;
  status: EquipmentStatus;
  is_rentable: boolean;
  is_addon: boolean;
  internal_only: boolean;
  notes: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać magazyn (docs/SUPABASE_SETUP.md).";

function toNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return isNaN(n) ? null : n;
}
const clean = (s: string) => (s.trim() ? s.trim() : null);

// Kod pozycji: użytkownik może podać własny; inaczej generujemy z nazwy + LOSOWY sufiks
// (crypto — bez ryzyka kolizji z zegara).
function genCode(name: string): string {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 8) || "POZ";
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${base}-${suffix}`;
}

// Znane błędy bazy → czytelny komunikat PL (użytkownik nie jest programistą).
function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/duplicate key|23505|unique constraint/i.test(msg)) return "Pozycja o tym kodzie już istnieje — podaj inny kod.";
  if (/invalid input syntax for type integer/i.test(msg)) return "Ilość musi być liczbą całkowitą.";
  if (/invalid input value for enum/i.test(msg)) return "Nieprawidłowy status pozycji (uruchom migrację magazynu 0034).";
  return msg;
}

function validate(v: InventoryFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.name.trim()) e.name = "Podaj nazwę pozycji.";
  const q = toNum(v.quantity);
  if (v.quantity.trim() && (q == null || q < 0 || !Number.isInteger(q))) e.quantity = "Ilość musi być liczbą całkowitą ≥ 0.";
  for (const [k, label] of [["unit_cost", "Cena zakupu"], ["rental_price", "Cena wynajmu"], ["replacement_value", "Wartość odtworzeniowa"]] as const) {
    if (v[k].trim() && toNum(v[k]) == null) e[k] = `${label} musi być liczbą.`;
  }
  return e;
}

// Mapper pól formularza. Kod zostaje pusty, jeśli użytkownik go nie podał —
// generowanie/zachowanie kodu rozstrzygają akcje (create vs update).
function toInput(v: InventoryFormValues): InventoryInput {
  return {
    code: v.code.trim(),
    name: v.name.trim(),
    category: clean(v.category),
    quantity: toNum(v.quantity) ?? 0,
    tracking: v.tracking === "INDIVIDUAL" ? "INDIVIDUAL" : "QUANTITY",
    unit: clean(v.unit),
    location: clean(v.location),
    set_number: clean(v.set_number),
    unit_cost: toNum(v.unit_cost),
    purchase_date: clean(v.purchase_date),
    supplier: clean(v.supplier),
    rental_price: toNum(v.rental_price),
    replacement_value: toNum(v.replacement_value),
    status: v.status,
    is_rentable: v.is_rentable,
    is_addon: v.is_addon,
    internal_only: v.internal_only,
    notes: clean(v.notes),
  };
}

export async function createInventoryAction(v: InventoryFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const fieldErrors = validate(v);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  try {
    const input = toInput(v);
    if (!input.code) input.code = genCode(v.name); // kod generujemy tylko przy tworzeniu
    const { id } = await createInventoryItem(input);
    revalidatePath("/inventory");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function updateInventoryAction(id: string, v: InventoryFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const fieldErrors = validate(v);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  try {
    const input = toInput(v);
    if (!input.code) {
      // Przy edycji puste pole Kod = zachowaj dotychczasowy (nie generuj nowego).
      const before = await getInventoryItem(id);
      input.code = before?.code || genCode(v.name);
    }
    await updateInventoryItem(id, input);
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${id}/edit`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

export async function setInventoryActiveAction(id: string, active: boolean): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    await setInventoryActive(id, active);
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${id}/edit`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zmienić statusu pozycji." };
  }
}
