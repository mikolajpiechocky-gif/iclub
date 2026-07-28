"use server";
// Server Action: synchronizacja ogłoszeń OLX + statystyk (tylko szef).
import { revalidatePath } from "next/cache";
import { syncOlxAdverts, clearAllOlxAdverts } from "@/lib/data/olx-adverts";
import { getCurrentProfile } from "@/lib/data/profiles";

export async function syncOlxAdvertsAction() {
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false as const, synced: 0, error: "Tylko szef." };
  return syncOlxAdverts();
}

// §OLX Usuń wszystkie ogłoszenia (naprawa po błędnym spięciu; konto zostaje podpięte).
export async function clearOlxAdvertsAction() {
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false as const, removed: 0, error: "Tylko szef." };
  try {
    const removed = await clearAllOlxAdverts();
    revalidatePath("/adverts");
    return { ok: true as const, removed };
  } catch (e) {
    return { ok: false as const, removed: 0, error: e instanceof Error ? e.message : "Nie udało się usunąć." };
  }
}
