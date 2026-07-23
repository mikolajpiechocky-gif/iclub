"use server";
// Server Actions: zgłoszenia i szkody (§22, §30).
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createIncident, setIncidentStatus } from "@/lib/data/incidents";
import { sendPushToOwners } from "@/lib/integrations/push";
import type { IncidentPriority, IncidentStatus } from "@/lib/data/types";

export interface IncidentFormValues {
  job_id: string;
  category: string;
  description: string;
  equipment: string;
  priority: IncidentPriority;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać zgłoszenia (docs/SUPABASE_SETUP.md).";

export async function createIncidentAction(v: IncidentFormValues): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  if (!v.description.trim() && !v.equipment.trim())
    return { ok: false, error: "Podaj opis albo czego dotyczy zgłoszenie." };
  try {
    await createIncident({
      job_id: v.job_id || null,
      category: v.category || "Inne",
      description: v.description.trim() || null,
      equipment: v.equipment.trim() || null,
      priority: v.priority,
    });
    await sendPushToOwners({
      title: v.priority === "HIGH" ? "🚨 Pilne zgłoszenie z terenu" : "Zgłoszenie z terenu",
      body: [v.category, v.equipment.trim() || v.description.trim().slice(0, 60)].filter(Boolean).join(" · "),
      url: "/media",
      tag: "incident",
    }).catch(() => {});
    revalidatePath("/media");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać zgłoszenia." };
  }
}

export async function setIncidentStatusAction(id: string, status: IncidentStatus): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    await setIncidentStatus(id, status);
    revalidatePath("/media");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd." };
  }
}
