"use server";
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { markRead, markAllRead } from "@/lib/data/notifications";

export interface ActionResult {
  ok: boolean;
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
