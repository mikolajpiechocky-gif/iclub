"use server";
// Server Actions: protokół po realizacji (§30) — koszty + oznaczanie sprzętu do czyszczenia/naprawy.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createCost } from "@/lib/data/costs";
import { createIncident } from "@/lib/data/incidents";
import { sendPushToOwners } from "@/lib/integrations/push";
import type { IncidentPriority } from "@/lib/data/types";

export interface ProtocolResult { ok: boolean; error?: string }

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać (docs/SUPABASE_SETUP.md).";

export async function addProtocolCostAction(jobId: string, category: string, amount: string, note: string): Promise<ProtocolResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const n = Number(amount.replace(",", "."));
  if (!category.trim()) return { ok: false, error: "Podaj kategorię kosztu." };
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: "Podaj kwotę większą od zera." };
  try {
    await createCost({ job_id: jobId, category: category.trim(), amount: Math.round(n * 100) / 100, spent_on: new Date().toISOString().slice(0, 10), note: note.trim() || null });
    revalidatePath(`/field/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać kosztu." };
  }
}

export async function markEquipmentAction(jobId: string, equipment: string, kind: "CLEAN" | "REPAIR"): Promise<ProtocolResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  if (!equipment.trim()) return { ok: false, error: "Podaj, jaki sprzęt." };
  const category = kind === "REPAIR" ? "Naprawa" : "Czyszczenie";
  const priority: IncidentPriority = kind === "REPAIR" ? "HIGH" : "LOW";
  try {
    await createIncident({ job_id: jobId, category, description: `${category} po realizacji`, equipment: equipment.trim(), priority });
    await sendPushToOwners({ title: kind === "REPAIR" ? "Sprzęt do naprawy" : "Sprzęt do czyszczenia", body: equipment.trim(), url: "/media", tag: "protocol-eq" }).catch(() => {});
    revalidatePath(`/field/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać zgłoszenia." };
  }
}
