"use client";
// Zadania serwisowe: dodawanie + lista z przesuwaniem statusu.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, TextField, SelectField, PrimaryButton, Pill, Alert } from "@/components/ui";
import { SERVICE_KINDS, SERVICE_STATUS_META, type ServiceStatus, type ServiceTaskRecord } from "@/lib/data/types";
import { createServiceTaskAction, setServiceStatusAction, type ServiceFormValues } from "./actions";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : null);

export function ServiceManager({ tasks, overdueDays = {} }: { tasks: ServiceTaskRecord[]; overdueDays?: Record<string, number> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState<ServiceFormValues>({ kind: "Sprawdzenie", equipment: "", description: "", due_date: "", weekly: false });
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ServiceFormValues>(k: K, val: ServiceFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createServiceTaskAction(v);
      if (res.ok) { setV({ kind: "Sprawdzenie", equipment: "", description: "", due_date: "", weekly: false }); router.refresh(); return; }
      setError(res.error ?? "Błąd");
    });
  };
  const go = (id: string, status: ServiceStatus) => {
    setError(null);
    startTransition(async () => {
      const res = await setServiceStatusAction(id, status);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <>
      {error && <div className="mb-4"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

      <SectionCard title="Nowe zadanie serwisowe" className="mb-4 p-5">
        <form onSubmit={add} className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
          <SelectField label="Rodzaj" value={v.kind} onChange={(e) => set("kind", e.target.value)}>
            {SERVICE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </SelectField>
          <TextField label="Sprzęt / namiot" placeholder="Np. Namiot 6×8 Żółty" value={v.equipment} onChange={(e) => set("equipment", e.target.value)} />
          <TextField label="Termin (opcjonalnie)" type="date" value={v.due_date} onChange={(e) => set("due_date", e.target.value)} />
          <div className="sm:col-span-2"><TextField label="Opis" placeholder="Co zrobić" value={v.description} onChange={(e) => set("description", e.target.value)} /></div>
          <label className="sm:col-span-2 flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-ink">
            <input type="checkbox" checked={Boolean(v.weekly)} onChange={(e) => set("weekly", e.target.checked)} className="h-4 w-4 accent-brand" />
            Powtarzaj co tydzień <span className="text-[11.5px] font-normal text-ink-2">— po „Zrobione” utworzy kolejne za 7 dni</span>
          </label>
          <div className="sm:col-span-2 flex justify-end"><PrimaryButton type="submit" icon="plus" disabled={pending}>{pending ? "Zapisywanie…" : "Dodaj zadanie"}</PrimaryButton></div>
        </form>
      </SectionCard>

      {tasks.length === 0 ? (
        <p className="text-[13px] text-ink-2">Brak zadań serwisowych.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          {tasks.map((t) => {
            const m = SERVICE_STATUS_META[t.status];
            const due = fmt(t.due_date);
            const overdue = overdueDays[t.id] ?? 0;
            const weekly = t.recurrence === "WEEKLY";
            return (
              <div key={t.id} className={`flex flex-wrap items-center gap-3 border-b border-border-soft px-4 py-3.5 last:border-0 ${overdue > 0 ? "bg-[#1f1113]" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold text-ink">
                    {t.kind}{t.equipment ? ` · ${t.equipment}` : ""}
                    {weekly && <span className="rounded-[6px] bg-[#1b2a3f] px-1.5 py-0.5 text-[10px] font-bold text-[#7fa8f5]">co tydzień</span>}
                    {overdue > 0 && <span className="rounded-[6px] bg-[#341a1d] px-1.5 py-0.5 text-[10px] font-bold text-bad">{overdue} {overdue === 1 ? "dzień" : "dni"} po terminie</span>}
                  </div>
                  <div className="mt-0.5 text-[12px] text-ink-2">{t.description || "—"}{due ? ` · termin ${due}` : ""}</div>
                </div>
                <Pill label={m.label} fg={m.fg} bg={m.bg} />
                <div className="flex gap-1.5">
                  {t.status === "OPEN" && <button onClick={() => go(t.id, "IN_PROGRESS")} disabled={pending} className="rounded-[9px] border border-border bg-surface-2 px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2">Podejmij</button>}
                  {t.status === "IN_PROGRESS" && <button onClick={() => go(t.id, "DONE")} disabled={pending} className="rounded-[9px] bg-[#22c55e] px-2.5 py-1.5 text-[11.5px] font-bold text-[#08170d]">Zrobione</button>}
                  {t.status === "DONE" && <button onClick={() => go(t.id, "OPEN")} disabled={pending} className="rounded-[9px] border border-border bg-surface-2 px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2">Otwórz</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
