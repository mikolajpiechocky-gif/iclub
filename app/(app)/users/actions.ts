"use server";
// Server Actions: zarządzanie użytkownikami (rola, imię, dodawanie). Tylko OWNER.
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isServiceRoleConfigured, createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/data/profiles";
import { setUserRole, setUserName } from "@/lib/data/users";
import type { UserRole, ProfileRecord } from "@/lib/data/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface InviteResult {
  ok: boolean;
  error?: string;
  email?: string;
  tempPassword?: string;
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

// Dodanie nowego użytkownika (konto tworzone przez service_role). Nowe konto ma
// rolę Pracownik — właściciela nadaje się później na liście. Zwraca hasło
// tymczasowe do jednorazowego przekazania (użytkownik zmieni je po zalogowaniu).
export async function inviteUserAction(email: string, fullName: string): Promise<InviteResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Tryb demo: skonfiguruj Supabase." };
  const me = await requireOwner();
  if (!me) return { ok: false, error: "Tylko właściciel dodaje użytkowników." };
  if (!isServiceRoleConfigured()) return { ok: false, error: "Brak klucza service_role na serwerze (dodaj SUPABASE_SERVICE_ROLE_KEY)." };

  const cleanEmail = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return { ok: false, error: "Podaj poprawny adres e-mail." };
  if (!fullName.trim()) return { ok: false, error: "Podaj imię i nazwisko." };

  const tempPassword = crypto.randomBytes(9).toString("base64url"); // ~12 znaków
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() },
    });
    if (error) {
      const dup = /already|exist|registered/i.test(error.message);
      return { ok: false, error: dup ? "Użytkownik z tym e-mailem już istnieje." : error.message };
    }
    // Profil tworzy trigger handle_new_user (Pracownik + imię z metadanych);
    // ustawiamy imię jawnie na wszelki wypadek (sesja właściciela).
    if (data.user?.id) {
      try { await setUserName(data.user.id, fullName.trim()); } catch {}
    }
    revalidatePath("/users");
    return { ok: true, email: cleanEmail, tempPassword };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się utworzyć konta." };
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
