"use client";
// Formularz kosztu (mobile-first, szybki). Przypisanie do zlecenia + kategoria.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PrimaryButton, SelectField, TextField, Alert } from "@/components/ui";
import { COST_CATEGORIES } from "@/lib/data/types";
import { createCostAction, type CostFormValues } from "./actions";

export function CostForm({ jobs }: { jobs: { id: string; label: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState<CostFormValues>({ job_id: jobs[0]?.id ?? "", category: "Paliwo", amount: "", spent_on: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof CostFormValues>(k: K, val: CostFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await createCostAction(v);
      if (res.ok) { router.push("/costs"); router.refresh(); return; }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) setFormError(res.error);
    });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-4 pb-28">
      <div className="mb-3 flex items-center gap-2.5">
        <Link href="/costs" className="text-[13px] font-bold text-ink-2">‹ Koszty</Link>
      </div>
      <h1 className="mb-4 font-display text-[22px] font-bold text-white">Dodaj koszt</h1>

      {formError && <div className="mb-4"><Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert></div>}

      <form onSubmit={submit}>
        {/* Kwota */}
        <div className="mb-4 rounded-card border border-border bg-surface p-4 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-2">Kwota</div>
          <div className="mt-1 flex items-center justify-center gap-1">
            <input inputMode="decimal" value={v.amount} onChange={(e) => set("amount", e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="0" className="w-40 bg-transparent text-center font-display text-[40px] font-bold text-white outline-none placeholder:text-muted" />
            <span className="font-display text-[24px] font-bold text-ink-2">zł</span>
          </div>
          {errors.amount && <div className="mt-1 text-[11.5px] font-semibold text-bad">{errors.amount}</div>}
        </div>

        {/* Kategorie */}
        <div className="mb-4">
          <div className="mb-2 text-[12.5px] font-semibold text-ink-2">Kategoria</div>
          <div className="flex flex-wrap gap-2">
            {COST_CATEGORIES.map((c) => (
              <button type="button" key={c} onClick={() => set("category", c)} className={`rounded-[10px] border px-3 py-2 text-[12.5px] font-semibold transition ${v.category === c ? "border-[#3a2a55] bg-[#271b3f] text-[#e0c8ff]" : "border-border bg-surface text-ink-2"}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3">
          <SelectField label="Zlecenie" value={v.job_id} onChange={(e) => set("job_id", e.target.value)}>
            <option value="">— bez zlecenia —</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
          </SelectField>
          <TextField label="Data" type="date" value={v.spent_on} onChange={(e) => set("spent_on", e.target.value)} />
          <TextField label="Opis (opcjonalnie)" placeholder="Np. tankowanie Orlen" value={v.note} onChange={(e) => set("note", e.target.value)} />
        </div>

        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md px-4 pb-4" style={{ background: "linear-gradient(#0f101600,#0f1016 30%)" }}>
          <PrimaryButton block icon="check" type="submit" disabled={pending}>{pending ? "Zapisywanie…" : `Zapisz koszt${v.amount ? ` · ${v.amount} zł` : ""}`}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}
