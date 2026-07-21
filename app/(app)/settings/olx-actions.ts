"use server";
// Server Action: ręczna synchronizacja rozmów OLX (tylko szef).
import { syncOlxThreads } from "@/lib/data/olx-sync";
import { getCurrentProfile } from "@/lib/data/profiles";

export async function syncOlxAction() {
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false as const, imported: 0, updated: 0, error: "Tylko szef." };
  return syncOlxThreads();
}
