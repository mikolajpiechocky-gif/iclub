"use server";
// Server Actions: rozładunek / protokół po realizacji (§II.5) — koszty + zgłoszenia.
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createCost } from "@/lib/data/costs";
import { createIncident } from "@/lib/data/incidents";
import { createServiceTask, defaultServiceAssigneeId } from "@/lib/data/service";
import { setActualKm } from "@/lib/data/transport";
import { syncTransportFuelCost } from "@/lib/data/realization-close";
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

// §II.17 Faktyczny przejazd (licznik) → przelicza koszt paliwa na pozycji transportu.
export async function saveActualKmAction(jobId: string, km: string): Promise<ProtocolResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const n = Number(km.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: "Podaj liczbę km większą od zera." };
  const res = await setActualKm(jobId, Math.round(n));
  if (!res.ok) return { ok: false, error: res.reason ?? "Nie udało się zapisać." };
  await syncTransportFuelCost(jobId).catch(() => {}); // faktyczne km → zaktualizuj koszt „Paliwo"
  revalidatePath(`/field/${jobId}`);
  revalidatePath(`/reservations`);
  revalidatePath("/costs");
  return { ok: true };
}

// §II.8 Demontaż: kontrola sprzętu — status niesprawnej pozycji → wspólna baza zgłoszeń serwisowych.
export type EqStatus = "Czyszczenie" | "Uszkodzony" | "Brak";

// Najbliższy poniedziałek (≥ dziś) — termin zbiorczego zadania serwisowego po weekendzie.
function nextMondayISO(): string {
  const d = new Date();
  const dow = d.getUTCDay(); // 0=nd..6=sob
  const add = (8 - (dow === 0 ? 7 : dow)) % 7; // pon=0, wt=6, …, nd=1
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

export async function reportEquipmentStatusAction(jobId: string, equipment: string, status: EqStatus, note: string): Promise<ProtocolResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  if (!equipment.trim()) return { ok: false, error: "Brak pozycji." };
  const priority: IncidentPriority = status === "Uszkodzony" ? "HIGH" : status === "Brak" ? "HIGH" : "MEDIUM";
  const kind = status === "Uszkodzony" ? "Naprawa" : status === "Brak" ? "Uzupełnienie" : "Czyszczenie";
  try {
    await createIncident({ job_id: jobId, category: "Serwis", description: `Demontaż — ${status}${note.trim() ? `: ${note.trim()}` : ""}`, equipment: equipment.trim(), priority });
    // §serwis Zbiorcze zadanie serwisowe na poniedziałek — wszystkie pozycje z realizacji (weekendowych)
    // lądują na jednej liście /service (checklista dla Bartka). Termin: najbliższy poniedziałek.
    const assignee = await defaultServiceAssigneeId().catch(() => null);
    await createServiceTask({ kind, equipment: equipment.trim(), description: note.trim() || null, due_date: nextMondayISO(), assigned_to: assignee }).catch(() => {});
    await sendPushToOwners({ title: `Serwis: ${status}`, body: `${equipment.trim()} — na poniedziałek`, url: "/service", tag: "teardown-eq" }).catch(() => {});
    revalidatePath(`/field/${jobId}`);
    revalidatePath("/service");
    revalidatePath("/dashboard");
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
