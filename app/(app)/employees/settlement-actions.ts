"use server";
// §24 Rozliczenia wypłat pracownika — oznaczanie realizacji jako rozliczonych (tylko szef).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentProfile } from "@/lib/data/profiles";
import { setAssignmentExtras, setEmployeePaidOut } from "@/lib/data/assignments";

// §rozliczenie Zapis narastająco wypłaconej kwoty (pozostało = do wypłaty − wypłacono). Tylko szef.
export async function setEmployeePaidOutAction(profileId: string, amount: number) {
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Tryb demo." };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false as const, error: "Tylko szef." };
  try {
    await setEmployeePaidOut(profileId, amount);
    revalidatePath(`/employees`);
    revalidatePath(`/employees/${profileId}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}

// §rozliczenie Zaznaczenie opinii/rolki(+link)/zwrotu paliwa dla danej realizacji (tylko szef).
export async function setAssignmentExtrasAction(
  assignmentId: string,
  profileId: string,
  extras: { reviewGiven?: boolean; reelGiven?: boolean; reelLink?: string | null; fuelAmount?: number },
) {
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Tryb demo." };
  const me = await getCurrentProfile();
  if (me?.role !== "OWNER") return { ok: false as const, error: "Tylko szef." };
  try {
    await setAssignmentExtras(assignmentId, extras);
    revalidatePath(`/employees`);
    revalidatePath(`/employees/${profileId}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}
