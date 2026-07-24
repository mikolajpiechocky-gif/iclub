"use client";
// Formularz namiotu (§17) — dodawanie/edycja. Zapis tylko Szef.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import type { TentRecord, TentStatus } from "@/lib/data/types";
import { createTentAction, updateTentAction, type TentFormValues } from "./tent-actions";

const STATUS: { v: TentStatus; label: string }[] = [
  { v: "AVAILABLE", label: "Dostępny" },
  { v: "RESERVED", label: "Zarezerwowany" },
  { v: "ON_SITE", label: "Na realizacji" },
  { v: "SERVICE", label: "W serwisie" },
  { v: "DAMAGED", label: "Uszkodzony" },
];

export function TentForm({ initial }: { initial?: TentRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(initial);

  const [v, setV] = useState<TentFormValues>({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    size: initial?.size ?? "",
    has_back_door: initial?.has_back_door ?? false,
    status: initial?.status ?? "AVAILABLE",
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof TentFormValues>(k: K, val: TentFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = isEdit ? await updateTentAction(initial!.id, v) : await createTentAction(v);
      if (res.ok) { router.push("/inventory"); router.refresh(); return; }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) setFormError(res.error);
    });
  };

  return (
    <div className="mx-auto max-w-[900px] px-5 py-6 md:px-8">
      <PageHeader
        title={isEdit ? "Edycja namiotu" : "Nowy namiot"}
        subtitle={isEdit ? initial?.name : "Dodaj namiot do magazynu"}
        back={{ href: "/inventory", label: "Magazyn" }}
      />

      {formError && <div className="mb-4"><Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert></div>}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <SectionCard title="Podstawowe" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-4 sm:grid-cols-2">
            <TextField label="Nazwa" placeholder="Namiot 6×8 niebieski" value={v.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
            <TextField label="Kod (opcjonalnie)" placeholder="auto z nazwy" value={v.code} onChange={(e) => set("code", e.target.value)} hint="Puste = wygeneruje się automatycznie" />
            <TextField label="Rozmiar" placeholder="6×8" value={v.size} onChange={(e) => set("size", e.target.value)} />
            <SelectField label="Status" value={v.status} onChange={(e) => set("status", e.target.value as TentStatus)}>
              {STATUS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </SelectField>
          </div>
          <label className="flex items-center gap-2.5 px-5 pb-5 text-[13px] text-ink">
            <input type="checkbox" checked={v.has_back_door} onChange={(e) => set("has_back_door", e.target.checked)} className="h-4 w-4 accent-accent" />
            Drzwi w tylnej ścianie
          </label>
        </SectionCard>

        <SectionCard title="Notatki" className="p-5">
          <div className="px-5 pb-5">
            <textarea aria-label="Notatki" rows={3} value={v.notes} onChange={(e) => set("notes", e.target.value)} className="w-full rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent" placeholder="Stan techniczny, uwagi serwisowe…" />
          </div>
        </SectionCard>

        <div className="flex flex-wrap justify-end gap-2.5">
          <SecondaryButton type="button" onClick={() => router.push("/inventory")}>Anuluj</SecondaryButton>
          <PrimaryButton type="submit" icon="check" disabled={pending}>
            {pending ? "Zapisywanie…" : isEdit ? "Zapisz zmiany" : "Dodaj namiot"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
