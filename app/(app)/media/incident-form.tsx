"use client";
// Formularz zgłoszenia / szkody (mobile). Zdjęcie jako placeholder (upload później).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PrimaryButton, SelectField, Alert } from "@/components/ui";
import { Icon } from "@/components/icons";
import { INCIDENT_CATEGORIES, INCIDENT_PRIORITY_LABELS, type IncidentPriority } from "@/lib/data/types";
import { createIncidentAction, type IncidentFormValues } from "./actions";

const PRIORITIES: IncidentPriority[] = ["LOW", "MEDIUM", "HIGH"];

export function IncidentForm({ jobs }: { jobs: { id: string; label: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState<IncidentFormValues>({ job_id: "", category: "Uszkodzenie", description: "", equipment: "", priority: "HIGH" });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof IncidentFormValues>(k: K, val: IncidentFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await createIncidentAction(v);
      if (res.ok) {
        setSaved(true);
        setV({ job_id: "", category: "Uszkodzenie", description: "", equipment: "", priority: "HIGH" });
        router.refresh();
        return;
      }
      setError(res.error ?? "Błąd");
    });
  };

  return (
    <div className="rounded-card-lg border border-[#3a1c1f] bg-surface p-4">
      <div className="mb-3 flex items-center gap-2 text-bad"><Icon name="warning" className="h-5 w-5" /><span className="font-display text-[15px] font-bold">Zgłoś szkodę / incydent</span></div>

      {saved && <div className="mb-3"><Alert tone="ok" title="Zgłoszenie zapisane">Dziękujemy — szef je zobaczy.</Alert></div>}
      {error && <div className="mb-3"><Alert tone="bad" title="Nie udało się zapisać">{error}</Alert></div>}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <button type="button" className="flex h-[90px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#3a3d4a]" style={{ background: "repeating-linear-gradient(135deg,#171922,#171922 9px,#1f212c 9px,#1f212c 18px)" }}>
          <Icon name="camera" className="h-6 w-6 text-ink-2" /><span className="text-[12px] font-semibold text-ink-2">Zdjęcie (wkrótce)</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Kategoria" value={v.category} onChange={(e) => set("category", e.target.value)}>
            {INCIDENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectField>
          <SelectField label="Zlecenie" value={v.job_id} onChange={(e) => set("job_id", e.target.value)}>
            <option value="">— bez zlecenia —</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
          </SelectField>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="equipment" className="text-[12.5px] font-semibold text-ink-2">Czego dotyczy (sprzęt)</label>
          <input id="equipment" value={v.equipment} onChange={(e) => set("equipment", e.target.value)} placeholder="Np. Namiot 6×8 — poszycie" className="min-h-[44px] rounded-field border border-border bg-surface-2 px-3.5 text-[14px] text-ink outline-none focus:border-accent" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="desc" className="text-[12.5px] font-semibold text-ink-2">Opis</label>
          <textarea id="desc" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} className="rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent" placeholder="Np. rozdarcie ~15 cm przy wejściu" />
        </div>

        <div>
          <div className="mb-2 text-[12.5px] font-semibold text-ink-2">Pilność</div>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button type="button" key={p} onClick={() => set("priority", p)} className={`flex-1 rounded-[10px] border py-2.5 text-[12.5px] font-bold transition ${v.priority === p ? "border-bad bg-[#341a1d] text-bad" : "border-border bg-surface-2 text-ink-2"}`}>{INCIDENT_PRIORITY_LABELS[p]}</button>
            ))}
          </div>
        </div>

        <PrimaryButton block icon="warning" type="submit" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz zgłoszenie"}</PrimaryButton>
      </form>
    </div>
  );
}
