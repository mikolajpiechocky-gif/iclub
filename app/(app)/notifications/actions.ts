"use server";
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { markRead, markAllRead, listMyNotifications, type NotificationRecord } from "@/lib/data/notifications";

export interface ActionResult {
  ok: boolean;
}

// Lista powiadomień do panelu pod dzwonkiem w nagłówku.
export async function getMyNotificationsAction(): Promise<NotificationRecord[]> {
  if (!isSupabaseConfigured()) return [];
  return listMyNotifications();
}

export async function markReadAction(id: string): Promise<ActionResult> {
  if (isSupabaseConfigured()) {
    await markRead(id);
    revalidatePath("/notifications");
  }
  return { ok: true };
}

export async function markAllReadAction(): Promise<ActionResult> {
  if (isSupabaseConfigured()) {
    await markAllRead();
    revalidatePath("/notifications");
  }
  return { ok: true };
}
