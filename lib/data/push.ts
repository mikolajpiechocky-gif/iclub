// Warstwa danych: subskrypcje Web Push. Zapis/usuwanie przez sesję użytkownika (RLS
// user_id = auth.uid()); odczyt do wysyłki przez service_role (wszystkich odbiorców).
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

export interface PushSubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  quiet_from: number | null;
  quiet_to: number | null;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function savePushSubscription(sub: WebPushSubscription, quietFrom: number | null, quietTo: number | null): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak zalogowanego użytkownika.");
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, quiet_from: quietFrom, quiet_to: quietTo },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

// Czy bieżący użytkownik ma choć jedną subskrypcję (do stanu przycisku).
export async function currentUserHasPush(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  return (count ?? 0) > 0;
}

// --- Odczyt do wysyłki (service_role, omija RLS) ---
export async function listSubscriptionsForUsers(userIds: string[]): Promise<PushSubRow[]> {
  if (!isServiceRoleConfigured() || !userIds.length) return [];
  const s = createAdminClient();
  const { data } = await s.from("push_subscriptions").select("endpoint, p256dh, auth, quiet_from, quiet_to").in("user_id", userIds);
  return (data ?? []) as PushSubRow[];
}

export async function listOwnerUserIds(): Promise<string[]> {
  if (!isServiceRoleConfigured()) return [];
  const s = createAdminClient();
  const { data } = await s.from("profiles").select("id").eq("role", "OWNER");
  return ((data ?? []) as { id: string }[]).map((p) => p.id);
}

export async function listEmployeeUserIds(): Promise<string[]> {
  if (!isServiceRoleConfigured()) return [];
  const s = createAdminClient();
  const { data } = await s.from("profiles").select("id").eq("role", "EMPLOYEE");
  return ((data ?? []) as { id: string }[]).map((p) => p.id);
}

export async function pruneDeadSubscriptions(endpoints: string[]): Promise<void> {
  if (!isServiceRoleConfigured() || !endpoints.length) return;
  const s = createAdminClient();
  await s.from("push_subscriptions").delete().in("endpoint", endpoints);
}
