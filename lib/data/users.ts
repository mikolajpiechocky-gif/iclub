// Warstwa danych: zarządzanie użytkownikami (profile + role). Zapis tylko OWNER
// (RLS: profiles_update_self dopuszcza szefa). W demo — dane przykładowe.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ProfileRecord, UserRole } from "./types";

const DEMO_USERS: ProfileRecord[] = [
  { id: "demo-owner", full_name: "Mikołaj (demo)", role: "OWNER" },
  { id: "demo-emp1", full_name: "Marek Wójcik", role: "EMPLOYEE" },
  { id: "demo-emp2", full_name: "Kamil Zieliński", role: "EMPLOYEE" },
];

export async function listUsers(): Promise<ProfileRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_USERS;
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, full_name, role, avatar_url").order("role").order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as ProfileRecord[];
}

// Avatar zespołu — miniatura (data URL) zapisywana w profilu.
export async function setUserAvatar(id: string, avatarUrl: string | null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setUserRole(id: string, role: UserRole): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setUserName(id: string, fullName: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", id);
  if (error) throw new Error(error.message);
}
