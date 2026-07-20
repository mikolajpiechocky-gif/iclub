// Warstwa danych: profile użytkowników i bieżąca tożsamość.
// W TRYBIE DEMO zwraca udawanego właściciela, aby ekrany działały bez Supabase.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ProfileRecord } from "./types";

export const DEMO_PROFILE: ProfileRecord = {
  id: "demo-owner",
  full_name: "Mikołaj (demo)",
  role: "OWNER",
};

export async function getCurrentProfile(): Promise<ProfileRecord | null> {
  if (!isSupabaseConfigured()) return DEMO_PROFILE;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (!data) {
    // Profil może jeszcze nie istnieć — bezpieczny fallback.
    return { id: user.id, full_name: user.email ?? "", role: "EMPLOYEE" };
  }
  return data as ProfileRecord;
}

// Id właścicieli — do powiadamiania o prośbach pracowników (np. o przypisanie).
export async function listOwnerIds(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id").eq("role", "OWNER");
  return ((data ?? []) as { id: string }[]).map((r) => r.id);
}
