"use server";
// Server Actions: subskrypcja powiadomień push (zapis/usuń/test) dla bieżącego użytkownika.
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { savePushSubscription, deletePushSubscription, type WebPushSubscription } from "@/lib/data/push";
import { getCurrentProfile } from "@/lib/data/profiles";
import { sendPushToUsers } from "@/lib/integrations/push";

export interface PushActionResult { ok: boolean; error?: string }

export async function subscribePushAction(sub: WebPushSubscription, quietFrom: number | null, quietTo: number | null): Promise<PushActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Tryb demo: skonfiguruj Supabase, aby włączyć powiadomienia." };
  try {
    await savePushSubscription(sub, quietFrom, quietTo);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać subskrypcji." };
  }
}

export async function unsubscribePushAction(endpoint: string): Promise<PushActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Tryb demo." };
  try {
    await deletePushSubscription(endpoint);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się wyłączyć powiadomień." };
  }
}

export async function sendTestPushAction(): Promise<PushActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Tryb demo." };
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false, error: "Brak zalogowanego użytkownika." };
  try {
    await sendPushToUsers([profile.id], { title: "iClub", body: "Powiadomienia działają ✅", url: "/notifications", tag: "test" });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się wysłać testu." };
  }
}
