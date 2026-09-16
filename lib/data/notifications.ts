// Warstwa danych: powiadomienia in-app (§8).
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface NotificationRecord {
  id: string;
  type: string | null;
  title: string;
  body: string | null;
  job_id: string | null;
  inquiry_id: string | null;
  read: boolean;
  created_at: string;
}

export async function listMyNotifications(): Promise<NotificationRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []) as NotificationRecord[];
}

export async function unreadCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient", user.id)
    .eq("read", false);
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

// Trwałe usunięcie powiadomienia (przycisk „Usuń").
export async function deleteNotification(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("id", id);
}

// §powiadomienia Sync ze statusem zapytania: nowe (NEW) świecą, procedowane gasną (read),
// wygrane/przegrane znikają (delete). Wołane przy każdej zmianie statusu leada.
export async function syncInquiryNotifications(inquiryId: string, status: string): Promise<void> {
  if (!isSupabaseConfigured() || !inquiryId) return;
  const supabase = await createClient();
  if (status === "WON" || status === "LOST") {
    await supabase.from("notifications").delete().eq("inquiry_id", inquiryId);
  } else if (status !== "NEW") {
    await supabase.from("notifications").update({ read: true }).eq("inquiry_id", inquiryId).eq("read", false);
  }
}

export async function markAllRead(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").update({ read: true }).eq("recipient", user.id).eq("read", false);
}

// Best-effort — nie przerywa akcji wywołującej, jeśli się nie uda.
export async function createNotification(recipient: string, title: string, body: string | null, type: string, jobId?: string | null): Promise<void> {
  if (!isSupabaseConfigured() || !recipient) return;
  try {
    const supabase = await createClient();
    await supabase.from("notifications").insert({ recipient, title, body, type, job_id: jobId ?? null });
  } catch {
    // ignoruj
  }
}
