// Warstwa danych: flota (pojazdy) i przypisania do zleceń (§31).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { VehicleRecord } from "./types";

const DEMO_VEHICLES: VehicleRecord[] = [
  { id: "dv1", name: "Iveco Daily", registration: "PO 00000", type: "Bus", fuel_type: "Diesel", consumption: 11.5, capacity: "do 3.5 t", mileage: 184000, insurance_date: "2026-11-01", inspection_date: "2026-09-15", notes: null, active: true },
  { id: "dv2", name: "Renault Master", registration: "PO 11111", type: "Bus", fuel_type: "Diesel", consumption: 10.8, capacity: "do 3.5 t", mileage: 96000, insurance_date: null, inspection_date: null, notes: null, active: true },
];

export interface VehicleInput {
  name: string;
  registration: string | null;
  type: string | null;
  fuel_type: string | null;
  consumption: number | null;
  capacity: string | null;
  mileage: number | null;
  insurance_date: string | null;
  inspection_date: string | null;
  notes: string | null;
}

export async function listVehicles(): Promise<VehicleRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_VEHICLES;
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicles").select("*").eq("active", true).order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as VehicleRecord[];
}

export async function getVehicle(id: string): Promise<VehicleRecord | null> {
  if (!isSupabaseConfigured()) return DEMO_VEHICLES.find((v) => v.id === id) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicles").select("*").eq("id", id).single();
  if (error) return null;
  return data as VehicleRecord;
}

export async function createVehicle(input: VehicleInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").insert(input);
  if (error) throw new Error(error.message);
}

export async function updateVehicle(id: string, input: VehicleInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

// --- Przypisania do zlecenia ---
export interface JobVehicle {
  id: string;
  vehicle_id: string;
  vehicle: { id: string; name: string; registration: string | null } | null;
}

export async function listJobVehicles(jobId: string): Promise<JobVehicle[]> {
  if (!isSupabaseConfigured()) {
    return jobId === "demo-job-1" ? [{ id: "djv1", vehicle_id: "dv1", vehicle: { id: "dv1", name: "Iveco Daily", registration: "PO 00000" } }] : [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_vehicles")
    .select("id, vehicle_id, vehicle:vehicles(id, name, registration)")
    .eq("job_id", jobId);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as JobVehicle[];
}

export async function assignVehicle(jobId: string, vehicleId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("job_vehicles").insert({ job_id: jobId, vehicle_id: vehicleId });
  if (error) throw new Error(error.message);
}

export async function removeJobVehicle(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("job_vehicles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Konflikt: ten sam pojazd przypisany do innego zlecenia w ten sam dzień.
export async function findVehicleConflicts(vehicleId: string, eventDate: string | null, excludeJobId: string): Promise<string[]> {
  if (!vehicleId || !eventDate || !isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_vehicles")
    .select("job:jobs(id, event_date, title, reservation:reservations(customer:customers(name)))")
    .eq("vehicle_id", vehicleId);
  if (error) return [];
  const rows = (data ?? []) as unknown as { job: { id: string; event_date: string | null; title: string | null; reservation: { customer: { name: string } | null } | null } | null }[];
  return rows
    .filter((r) => r.job && r.job.id !== excludeJobId && r.job.event_date === eventDate)
    .map((r) => `${r.job!.reservation?.customer?.name ?? r.job!.title ?? "Zlecenie"} (${r.job!.event_date})`);
}
