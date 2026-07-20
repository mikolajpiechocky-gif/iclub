"use server";
// Server Actions: zarządzanie użytkownikami (rola, imię). Tylko OWNER.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { setUserRole, setUserName } from "@/lib/data/users";
import type { UserRole, ProfileRecord } from "@/lib/data/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zarządzać użytkownikami.";

async function requireOwner(): Promise<ProfileRecord | null> {
  const p = await getCurrentProfile();
  return p?.role === "OWNER" ? p : null;
}

export async function updateUserRoleAction(id: string, role: UserRole): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const me = await requireOwner();
  if (!me) return { ok: false, error: "Tylko właściciel zarządza użytkownikami." };
  if (id === me.id) return { ok: false, error: "Nie zmienisz własnej roli (poproś innego właściciela)." };
  if (role !== "OWNER" && role !== "EMPLOYEE") return { ok: false, error: "Nieprawidłowa rola." };
  try {
    // Ochrona ostatniego właściciela jest wymuszona atomowo w bazie (trigger 0025).
    await setUserRole(id, role);
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nie udało się zapisać roli.";
    return { ok: false, error: /jeden wlasciciel|jeden właściciel/i.test(msg) ? "Musi zostać przynajmniej jeden właściciel." : msg };
  }
}

export async function updateUserNameAction(id: string, fullName: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const me = await requireOwner();
  if (!me) return { ok: false, error: "Tylko właściciel zarządza użytkownikami." };
  if (!fullName.trim()) return { ok: false, error: "Podaj imię i nazwisko." };
  try {
    await setUserName(id, fullName.trim());
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać imienia." };
  }
}
