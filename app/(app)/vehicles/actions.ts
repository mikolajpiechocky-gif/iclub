"use server";
// Server Actions: flota (§31). Konfiguracja pojazdów tylko OWNER; przypisania CRUD.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { createVehicle, updateVehicle, assignVehicle, removeJobVehicle, type VehicleInput } from "@/lib/data/vehicles";

export interface VehicleFormValues {
  name: string;
  registration: string;
  type: string;
  fuel_type: string;
  consumption: string;
  capacity: string;
  mileage: string;
  insurance_date: string;
  inspection_date: string;
  notes: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać (docs/SUPABASE_SETUP.md).";

function toNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return isNaN(n) ? null : n;
}
function clean(s: string): string | null {
  const t = s.trim();
  return t ? t : null;
}

function toInput(v: VehicleFormValues): VehicleInput {
  return {
    name: v.name.trim(),
    registration: clean(v.registration),
    type: clean(v.type),
    fuel_type: clean(v.fuel_type),
    consumption: toNum(v.consumption),
    capacity: clean(v.capacity),
    mileage: toNum(v.mileage),
    insurance_date: clean(v.insurance_date),
    inspection_date: clean(v.inspection_date),
    notes: clean(v.notes),
  };
}

async function ownerError(): Promise<string | null> {
  const p = await getCurrentProfile();
  return p?.role === "OWNER" ? null : "Tylko właściciel zarządza flotą.";
}

export async function createVehicleAction(v: VehicleFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const err = await ownerError();
  if (err) return { ok: false, error: err };
  if (!v.name.trim()) return { ok: false, fieldErrors: { name: "Podaj nazwę pojazdu." } };
  try { await createVehicle(toInput(v)); revalidatePath("/vehicles"); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Błąd." }; }
}

export async function updateVehicleAction(id: string, v: VehicleFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const err = await ownerError();
  if (err) return { ok: false, error: err };
  if (!v.name.trim()) return { ok: false, fieldErrors: { name: "Podaj nazwę pojazdu." } };
  try { await updateVehicle(id, toInput(v)); revalidatePath("/vehicles"); revalidatePath(`/vehicles/${id}/edit`); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Błąd." }; }
}

export async function assignVehicleAction(jobId: string, vehicleId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const err = await ownerError();
  if (err) return { ok: false, error: err };
  if (!vehicleId) return { ok: false, error: "Wybierz pojazd." };
  try { await assignVehicle(jobId, vehicleId); revalidatePath(`/jobs/${jobId}`); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Błąd." }; }
}

export async function removeJobVehicleAction(id: string, jobId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const err = await ownerError();
  if (err) return { ok: false, error: err };
  try { await removeJobVehicle(id); revalidatePath(`/jobs/${jobId}`); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Błąd." }; }
}
