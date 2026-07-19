// Warstwa danych: dostępność (niedostępność) pracowników (§11).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AvailabilityRecord, AvailabilityWithProfile } from "./types";

const DEMO_AVAIL: AvailabilityWithProfile[] = [
  { id: "dav1", profile_id: "demo-emp2", profile: { id: "demo-emp2", full_name: "Kuba L." }, start_date: "2026-07-25", end_date: "2026-07-26", note: "Wyjazd rodzinny", created_at: "2026-07-14T10:00:00.000Z" },
];

export async function listAllAvailability(): Promise<AvailabilityWithProfile[]> {
  if (!isSupabaseConfigured()) return DEMO_AVAIL;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_availability")
    .select("*, profile:profiles(id, full_name)")
    .order("start_date");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AvailabilityWithProfile[];
}

export async function listMyAvailability(profileId: string): Promise<AvailabilityRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_AVAIL.filter((a) => a.profile_id === profileId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_availability")
    .select("*")
    .eq("profile_id", profileId)
    .order("start_date");
  if (error) throw new Error(error.message);
  return (data ?? []) as AvailabilityRecord[];
}

export async function addAvailability(profileId: string, start: string, end: string, note: string | null): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("employee_availability")
    .insert({ profile_id: profileId, start_date: start, end_date: end, note, created_by: user?.id ?? null });
  if (error) throw new Error(error.message);
}

export async function removeAvailability(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("employee_availability").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Zbiór profili niedostępnych w danym dniu (do ostrzeżeń przy przypisaniu).
export async function getUnavailableProfileIds(dateStr: string | null): Promise<string[]> {
  if (!dateStr) return [];
  if (!isSupabaseConfigured()) {
    return DEMO_AVAIL.filter((a) => a.start_date <= dateStr && a.end_date >= dateStr).map((a) => a.profile_id);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_availability")
    .select("profile_id")
    .lte("start_date", dateStr)
    .gte("end_date", dateStr);
  if (error) return [];
  return ((data ?? []) as { profile_id: string }[]).map((r) => r.profile_id);
}
