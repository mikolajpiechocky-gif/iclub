"use server";
// Server Actions: rozładunek / protokół po realizacji (§II.5) — koszty + zgłoszenia.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createCost } from "@/lib/data/costs";
import { createIncident } from "@/lib/data/incidents";
import { sendPushToOwners } from "@/lib/integrations/push";
import type { IncidentPriority } from "@/lib/data/types";

export interface ProtocolResult { ok: boolean; error?: string }

const DEMO = "Tryb demo: skonfiguruj Supabase, aby zapisywać (docs/SUPABASE_SETUP.md).";

// §II.5 Dodaj koszt: nazwa + kwota + komentarz.
export async function addProtocolCostAction(jobId: string, name: string, amount: string, comment: string): Promise<ProtocolResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const n = Number(amount.replace(",", "."));
  if (!name.trim()) return { ok: false, error: "Podaj nazwę kosztu." };
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: "Podaj kwotę większą od zera." };
  try {
    await createCost({ job_id: jobId, category: name.trim(), amount: Math.round(n * 100) / 100, spent_on: new Date().toISOString().slice(0, 10), note: comment.trim() || null });
    revalidatePath(`/field/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać kosztu." };
  }
}

// §II.8 Demontaż: kontrola sprzętu — status niesprawnej pozycji → wspólna baza zgłoszeń serwisowych.
export type EqStatus = "Czyszczenie" | "Uszkodzony" | "Brak";

export async function reportEquipmentStatusAction(jobId: string, equipment: string, status: EqStatus, note: string): Promise<ProtocolResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  if (!equipment.trim()) return { ok: false, error: "Brak pozycji." };
  const priority: IncidentPriority = status === "Uszkodzony" ? "HIGH" : status === "Brak" ? "HIGH" : "MEDIUM";
  try {
    await createIncident({ job_id: jobId, category: "Serwis", description: `Demontaż — ${status}${note.trim() ? `: ${note.trim()}` : ""}`, equipment: equipment.trim(), priority });
    await sendPushToOwners({ title: `Sprzęt: ${status}`, body: equipment.trim(), url: "/media", tag: "teardown-eq" }).catch(() => {});
    revalidatePath(`/field/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}

export type IssueType = "Uwaga" | "Incydent" | "Pomysł";

// §II.5 Dodaj zgłoszenie: typ (Uwaga / Incydent / Pomysł) + opis.
export async function addIssueAction(jobId: string, type: IssueType, description: string): Promise<ProtocolResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  if (!description.trim()) return { ok: false, error: "Opisz zgłoszenie." };
  const priority: IncidentPriority = type === "Incydent" ? "HIGH" : type === "Uwaga" ? "MEDIUM" : "LOW";
  try {
    await createIncident({ job_id: jobId, category: type, description: description.trim(), equipment: null, priority });
    await sendPushToOwners({ title: `Zgłoszenie: ${type}`, body: description.trim().slice(0, 80), url: "/media", tag: "issue" }).catch(() => {});
    revalidatePath(`/field/${jobId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać zgłoszenia." };
  }
}
