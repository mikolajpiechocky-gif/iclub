// Warstwa danych: zadania serwisowe (§29).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ServiceTaskRecord, ServiceStatus } from "./types";

const DEMO_SERVICE: ServiceTaskRecord[] = [
  { id: "ds1", equipment: "Namiot 6×8 Żółty — poszycie", kind: "Naprawa", description: "Rozdarcie przy wejściu — zszyć/załatać.", status: "OPEN", due_date: "2026-07-22", recurrence: null, created_at: "2026-07-18T10:00:00.000Z" },
  { id: "ds2", equipment: "Wytwornica dymu", kind: "Sprawdzenie", description: "Sprawdzić pompę po sezonie.", status: "IN_PROGRESS", due_date: null, recurrence: null, created_at: "2026-07-18T10:00:00.000Z" },
];

export interface ServiceInput {
  equipment: string | null;
  kind: string;
  description: string | null;
  due_date: string | null;
  recurrence?: string | null; // 'WEEKLY' = cotygodniowe
  incident_id?: string | null; // powiązanie z zgłoszeniem źródłowym (identyfikowalność §18)
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
  // §18 Cykliczność: domknięcie cotygodniowego zadania tworzy kolejne wystąpienie za 7 dni
  // (od terminu, a gdy brak — od dziś). Nowe zadanie startuje jako OPEN.
  if (status === "DONE") {
    const { data: cur } = await supabase
      .from("service_tasks")
      .select("equipment, kind, description, due_date, recurrence, incident_id, status")
      .eq("id", id)
      .maybeSingle();
    const t = cur as (ServiceInput & { recurrence: string | null; status: ServiceStatus }) | null;
    if (t && t.recurrence === "WEEKLY" && t.status !== "DONE") {
      const base = t.due_date ? new Date(`${t.due_date}T00:00:00`) : new Date();
      const next = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("service_tasks").insert({
        equipment: t.equipment, kind: t.kind, description: t.description,
        due_date: next, recurrence: "WEEKLY", incident_id: t.incident_id ?? null, created_by: user?.id ?? null,
      });
    }
  }
  const { error } = await supabase.from("service_tasks").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}
