"use server";
// Server Action: synchronizacja ogłoszeń OLX + statystyk (tylko szef).
import { syncOlxAdverts } from "@/lib/data/olx-adverts";
import { getCurrentProfile } from "@/lib/data/profiles";

export async function syncOlxAdvertsAction() {
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false as const, synced: 0, error: "Tylko szef." };
  return syncOlxAdverts();
}
