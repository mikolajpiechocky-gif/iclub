"use server";
// Server Actions: synchronizacja OLX i rozłączenie konta (tylko szef).
import { revalidatePath } from "next/cache";
import { syncOlxThreads } from "@/lib/data/olx-sync";
import { disconnectAndClearOlx } from "@/lib/data/olx";
import { getCurrentProfile } from "@/lib/data/profiles";

export async function syncOlxAction() {
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false as const, imported: 0, updated: 0, error: "Tylko szef." };
  return syncOlxThreads();
}

// Rozłącza konto OLX (czyści tokeny) i USUWA zaimportowane ogłoszenia + leady z OLX.
// Do naprawy sytuacji, gdy podpięto złe konto — po tym „Połącz OLX" zaczyna od zera.
export async function disconnectOlxAction() {
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false as const, error: "Tylko szef." };
  try {
    const res = await disconnectAndClearOlx();
    revalidatePath("/settings");
    revalidatePath("/adverts");
    revalidatePath("/leads");
    return { ok: true as const, ...res };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Nie udało się rozłączyć." };
  }
}
