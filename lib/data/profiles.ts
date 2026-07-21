// Warstwa danych: profile użytkowników i bieżąca tożsamość.
// W TRYBIE DEMO zwraca udawanego szefa, aby ekrany działały bez Supabase.
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
    .select("id, full_name, role, avatar_url")
    .eq("id", user.id)
    .single();

  if (!data) {
    // Profil może jeszcze nie istnieć — bezpieczny fallback.
    return { id: user.id, full_name: user.email ?? "", role: "EMPLOYEE" };
  }
  return data as ProfileRecord;
}

// Imię profilu po id (np. autor ręcznego ustalenia godziny montażu). null gdy brak.
export async function getProfileName(id: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name").eq("id", id).maybeSingle();
  return (data?.full_name as string | null) ?? null;
}

// Id szefi — do powiadamiania o prośbach pracowników (np. o przypisanie).
export async function listOwnerIds(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id").eq("role", "OWNER");
  return ((data ?? []) as { id: string }[]).map((r) => r.id);
}
