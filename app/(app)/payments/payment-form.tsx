"use client";
// Formularz dodania płatności do zlecenia.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_META, PAYMENT_STATUS_ORDER, type PaymentMethod, type PaymentStatus } from "@/lib/data/types";
import { createPaymentAction, type PaymentFormValues } from "./actions";

export function PaymentForm({ jobs }: { jobs: { id: string; label: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState<PaymentFormValues>({ job_id: jobs[0]?.id ?? "", title: "", method: "TRANSFER", amount: "", status: "PLANNED", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof PaymentFormValues>(k: K, val: PaymentFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await createPaymentAction(v);
      if (res.ok) { router.push("/payments"); router.refresh(); return; }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) setFormError(res.error);
    });
  };

  return (
    <div className="mx-auto max-w-[720px] px-5 py-6 md:px-8">
      <PageHeader title="Nowa płatność" subtitle="Przypisz płatność do zlecenia" back={{ href: "/payments", label: "Płatności" }} />
      {formError && <div className="mb-4"><Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert></div>}
      <form onSubmit={submit}>
        <SectionCard title="Dane płatności" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
            <SelectField label="Zlecenie" value={v.job_id} onChange={(e) => set("job_id", e.target.value)}>
              <option value="">— wybierz zlecenie —</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
            </SelectField>
            {errors.job_id && <span className="text-[11.5px] font-semibold text-bad sm:-mt-2">{errors.job_id}</span>}
            <TextField label="Tytuł" placeholder="Zadatek / Dopłata / Kaucja" value={v.title} onChange={(e) => set("title", e.target.value)} />
            <TextField label="Kwota (zł)" inputMode="numeric" placeholder="2000" value={v.amount} onChange={(e) => set("amount", e.target.value)} error={errors.amount} />
            <SelectField label="Metoda" value={v.method} onChange={(e) => set("method", e.target.value as PaymentMethod)}>
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
            </SelectField>
            <SelectField label="Status" value={v.status} onChange={(e) => set("status", e.target.value as PaymentStatus)}>
              {PAYMENT_STATUS_ORDER.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_META[s].label}</option>)}
            </SelectField>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="note" className="text-[12.5px] font-semibold text-ink-2">Notatka</label>
              <textarea id="note" rows={2} value={v.note} onChange={(e) => set("note", e.target.value)} className="rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent" placeholder="Np. gotówka zgłoszona przez Marka" />
            </div>
          </div>
        </SectionCard>
        <div className="mt-4 flex justify-end gap-2.5">
          <SecondaryButton type="button" onClick={() => router.push("/payments")}>Anuluj</SecondaryButton>
          <PrimaryButton type="submit" icon="check" disabled={pending}>{pending ? "Zapisywanie…" : "Dodaj płatność"}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}
