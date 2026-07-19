"use server";
// Server Actions: zadania serwisowe (§29).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServiceTask, setServiceStatus } from "@/lib/data/service";
import type { ServiceStatus } from "@/lib/data/types";

export interface ServiceFormValues {
  kind: string;
  equipment: string;
  description: string;
  due_date: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać (docs/SUPABASE_SETUP.md).";

export async function createServiceTaskAction(v: ServiceFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  if (!v.equipment.trim() && !v.description.trim())
    return { ok: false, error: "Podaj sprzęt albo opis zadania." };
  try {
    await createServiceTask({
      kind: v.kind || "Sprawdzenie",
      equipment: v.equipment.trim() || null,
      description: v.description.trim() || null,
      due_date: v.due_date || null,
    });
    revalidatePath("/service");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać zadania." };
  }
}

export async function setServiceStatusAction(id: string, status: ServiceStatus): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    await setServiceStatus(id, status);
    revalidatePath("/service");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd." };
  }
}
