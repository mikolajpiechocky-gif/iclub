// Warstwa danych: checklisty pakowania. Odczyt/zapis Supabase; fallback demo.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ChecklistItemRecord } from "./types";
import type { ChecklistTemplateItem } from "@/lib/domain/checklist";

const DEMO_CHECKLIST: ChecklistItemRecord[] = [
  { id: "dc1", job_id: "demo-job-1", category: "Magazyn", label: "Namiot 6×8 Niebieski — poszycie", qty: "1 szt.", required: true, done: true, problem: false, sort: 0 },
  { id: "dc2", job_id: "demo-job-1", category: "Magazyn", label: "Dmuchawa + wąż", qty: "1 szt.", required: true, done: true, problem: false, sort: 1 },
  { id: "dc3", job_id: "demo-job-1", category: "Magazyn", label: "Kotwy i obciążniki", qty: "8 szt.", required: true, done: false, problem: false, sort: 2 },
  { id: "dc4", job_id: "demo-job-1", category: "Załadunek", label: "Kolumny aktywne", qty: "2 szt.", required: false, done: true, problem: false, sort: 3 },
  { id: "dc5", job_id: "demo-job-1", category: "Załadunek", label: "Kable i zasilanie", qty: null, required: true, done: false, problem: true, sort: 4 },
  { id: "dc6", job_id: "demo-job-1", category: "Dokumenty", label: "Umowa i dokumenty", qty: null, required: true, done: false, problem: false, sort: 5 },
];

export async function listChecklistItems(jobId: string): Promise<ChecklistItemRecord[]> {
  if (!isSupabaseConfigured()) return DEMO_CHECKLIST.filter((i) => i.job_id === jobId || jobId === "demo-job-1");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("job_id", jobId)
    .order("sort");
  if (error) throw new Error(error.message);
  return (data ?? []) as ChecklistItemRecord[];
}

export async function generateChecklist(jobId: string, template: ChecklistTemplateItem[]): Promise<void> {
  const supabase = await createClient();
  // Nie duplikuj — najpierw usuń istniejące pozycje tego zlecenia.
  await supabase.from("checklist_items").delete().eq("job_id", jobId);
  const rows = template.map((t, i) => ({
    job_id: jobId,
    category: t.category,
    label: t.label,
    qty: t.qty ?? null,
    required: t.required,
    sort: i,
  }));
  if (rows.length) {
    const { error } = await supabase.from("checklist_items").insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function toggleChecklistItem(id: string, done: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);
}
