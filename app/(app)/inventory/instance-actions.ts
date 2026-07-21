"use server";
// §17.2 Server Actions: konkretne egzemplarze sprzętu. Edycja dla każdego pracownika (§17.3).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createInstance, updateInstance, setInstanceActive, type InstanceInput } from "@/lib/data/instances";
import type { EquipmentStatus } from "@/lib/data/types";

export interface InstanceFormValues {
  serial_number: string;
  label: string;
  status: EquipmentStatus;
  photo_url: string;
  notes: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać egzemplarze.";
const clean = (s: string) => (s.trim() ? s.trim() : null);

function validate(v: InstanceFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.serial_number.trim() && !v.label.trim()) e.label = "Podaj numer seryjny lub oznaczenie egzemplarza.";
  return e;
}

// Zdjęcie sprawdzamy osobno (komunikat na poziomie formularza, nie nadpisuje pola).
// Limit liczony po realnych bajtach (base64 puchnie o ~33%).
function photoError(dataUrl: string): string | null {
  if (!dataUrl) return null;
  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(dataUrl)) return "Nieprawidłowy plik zdjęcia.";
  if (Math.floor(dataUrl.length * 0.75) > 500_000) return "Zdjęcie za duże — wybierz mniejsze.";
  return null;
}

function toInput(v: InstanceFormValues): InstanceInput {
  return {
    serial_number: clean(v.serial_number),
    label: clean(v.label),
    status: v.status,
    photo_url: v.photo_url ? v.photo_url : null,
    notes: clean(v.notes),
  };
}

export async function createInstanceAction(equipmentId: string, v: InstanceFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const fieldErrors = validate(v);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  const pe = photoError(v.photo_url);
  if (pe) return { ok: false, error: pe };
  try {
    const { id } = await createInstance(equipmentId, toInput(v));
    revalidatePath(`/inventory/${equipmentId}/edit`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się dodać egzemplarza." };
  }
}

export async function updateInstanceAction(id: string, equipmentId: string, v: InstanceFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const fieldErrors = validate(v);
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  const pe = photoError(v.photo_url);
  if (pe) return { ok: false, error: pe };
  try {
    await updateInstance(id, toInput(v));
    revalidatePath(`/inventory/${equipmentId}/edit`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać egzemplarza." };
  }
}

export async function setInstanceActiveAction(id: string, equipmentId: string, active: boolean): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    await setInstanceActive(id, active);
    revalidatePath(`/inventory/${equipmentId}/edit`);
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zmienić statusu egzemplarza." };
  }
}
