// Warstwa danych: zadania serwisowe (§29).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ServiceTaskRecord, ServiceStatus } from "./types";

const DEMO_SERVICE: ServiceTaskRecord[] = [
  { id: "ds1", equipment: "Namiot 6×8 Żółty — poszycie", kind: "Naprawa", description: "Rozdarcie przy wejściu — zszyć/załatać.", status: "OPEN", due_date: "2026-07-22", created_at: "2026-07-18T10:00:00.000Z" },
  { id: "ds2", equipment: "Wytwornica dymu", kind: "Sprawdzenie", description: "Sprawdzić pompę po sezonie.", status: "IN_PROGRESS", due_date: null, created_at: "2026-07-18T10:00:00.000Z" },
];

export interface ServiceInput {
  equipment: string | null;
  kind: string;
  description: string | null;
  due_date: string | null;
}

export async function listServiceTasks(): Promise<ServiceTaskRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_SERVICE;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_tasks")
    .select("*")
    .order("status")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ServiceTaskRecord[];
}

export async function createServiceTask(input: ServiceInput): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("service_tasks").insert({ ...input, created_by: user?.id ?? null });
  if (error) throw new Error(error.message);
}

export async function setServiceStatus(id: string, status: ServiceStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("service_tasks").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}
