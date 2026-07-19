"use client";
// Formularz zapytania (dodawanie / edycja) — walidacja, powiązanie z klientem,
// status i źródło. Komunikaty sukcesu i błędów.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import type { InquiryRecord, InquiryStatus } from "@/lib/data/types";
import { INQUIRY_STATUS_LABELS, INQUIRY_STATUS_ORDER, INQUIRY_SOURCE_LABELS } from "@/lib/data/types";
import { createInquiryAction, updateInquiryAction, type InquiryFormValues } from "./actions";

type CustomerOption = { id: string; name: string };

export function InquiryForm({ initial, customers }: { initial?: InquiryRecord; customers: CustomerOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(initial);

  const [v, setV] = useState<InquiryFormValues>({
    customer_id: initial?.customer_id ?? "",
    event_type: initial?.event_type ?? "",
    event_date: initial?.event_date ?? "",
    location: initial?.location ?? "",
    guests: initial?.guests != null ? String(initial.guests) : "",
    tent_interest: initial?.tent_interest ?? "",
    package_interest: initial?.package_interest ?? "",
    addons_note: initial?.addons_note ?? "",
    source: initial?.source ?? "",
    status: initial?.status ?? "NEW",
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (k: keyof InquiryFormValues, val: string) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = isEdit
        ? await updateInquiryAction(initial!.id, v)
        : await createInquiryAction(v);
      if (res.ok) {
        router.push("/inquiries");
        router.refresh();
        return;
      }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) setFormError(res.error);
    });
  };

  return (
    <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
      <PageHeader
        title={isEdit ? "Edycja zapytania" : "Nowe zapytanie"}
        subtitle={isEdit ? "Zaktualizuj dane zapytania" : "Zapisz zapytanie klienta"}
        back={{ href: "/inquiries", label: "Zapytania" }}
      />

      {formError && (
        <div className="mb-4">
          <Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert>
        </div>
      )}

      {customers.length === 0 && (
        <div className="mb-4">
          <Alert tone="info" title="Brak klientów">
            Możesz zapisać zapytanie bez klienta, ale warto najpierw{" "}
            <Link href="/customers/new" className="font-bold">dodać klienta</Link> i połączyć je.
          </Alert>
        </div>
      )}

      <form onSubmit={submit}>
        <SectionCard title="Dane zapytania" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
            <SelectField label="Klient" value={v.customer_id} onChange={(e) => set("customer_id", e.target.value)}>
              <option value="">— bez klienta —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </SelectField>
            <SelectField label="Status" value={v.status} onChange={(e) => set("status", e.target.value as InquiryStatus)}>
              {INQUIRY_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{INQUIRY_STATUS_LABELS[s]}</option>
              ))}
            </SelectField>
            <TextField label="Rodzaj imprezy" placeholder="Osiemnastka" value={v.event_type} onChange={(e) => set("event_type", e.target.value)} />
            <TextField label="Data imprezy" type="date" value={v.event_date} onChange={(e) => set("event_date", e.target.value)} />
            <TextField label="Lokalizacja" placeholder="Tarnowo Podgórne" value={v.location} onChange={(e) => set("location", e.target.value)} />
            <TextField label="Liczba osób" inputMode="numeric" placeholder="45" value={v.guests} onChange={(e) => set("guests", e.target.value)} error={errors.guests} />
            <TextField label="Namiot / rozmiar" placeholder="6×8 Blue" value={v.tent_interest} onChange={(e) => set("tent_interest", e.target.value)} />
            <TextField label="Pakiet" placeholder="Premium" value={v.package_interest} onChange={(e) => set("package_interest", e.target.value)} />
            <SelectField label="Źródło zapytania" value={v.source} onChange={(e) => set("source", e.target.value)}>
              <option value="">— nie podano —</option>
              {(Object.keys(INQUIRY_SOURCE_LABELS) as (keyof typeof INQUIRY_SOURCE_LABELS)[]).map((s) => (
                <option key={s} value={s}>{INQUIRY_SOURCE_LABELS[s]}</option>
              ))}
            </SelectField>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="addons" className="text-[12.5px] font-semibold text-ink-2">Dodatki (notatka)</label>
              <textarea id="addons" rows={2} value={v.addons_note} onChange={(e) => set("addons_note", e.target.value)} className="rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent" placeholder="Np. karaoke, strefa VIP, dodatkowe nagłośnienie" />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-[12.5px] font-semibold text-ink-2">Notatki</label>
              <textarea id="notes" rows={3} value={v.notes} onChange={(e) => set("notes", e.target.value)} className="rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent" placeholder="Ustalenia, uwagi, historia kontaktu…" />
            </div>
          </div>
        </SectionCard>

        <div className="mt-4 flex justify-end gap-2.5">
          <SecondaryButton type="button" onClick={() => router.push("/inquiries")}>Anuluj</SecondaryButton>
          <PrimaryButton type="submit" icon="check" disabled={pending}>
            {pending ? "Zapisywanie…" : isEdit ? "Zapisz zmiany" : "Dodaj zapytanie"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
