"use client";
// Formularz klienta (dodawanie / edycja) — walidacja, komunikaty sukcesu i błędów.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import type { CustomerRecord } from "@/lib/data/types";
import { CUSTOMER_TYPE_LABELS } from "@/lib/data/types";
import { createCustomerAction, updateCustomerAction, type CustomerFormValues } from "./actions";

export function CustomerForm({ initial }: { initial?: CustomerRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(initial);

  const [v, setV] = useState<CustomerFormValues>({
    type: initial?.type ?? "PRIVATE",
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    city: initial?.city ?? "",
    address: initial?.address ?? "",
    tax_id: initial?.tax_id ?? "",
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (k: keyof CustomerFormValues, val: string) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = isEdit
        ? await updateCustomerAction(initial!.id, v)
        : await createCustomerAction(v);
      if (res.ok) {
        router.push("/customers");
        router.refresh();
        return;
      }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) setFormError(res.error);
    });
  };

  return (
    <div className="mx-auto max-w-[760px] px-5 py-6 md:px-8">
      <PageHeader
        title={isEdit ? "Edycja klienta" : "Nowy klient"}
        subtitle={isEdit ? initial!.name : "Dodaj klienta do bazy"}
        back={{ href: "/customers", label: "Klienci" }}
      />

      {formError && (
        <div className="mb-4">
          <Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert>
        </div>
      )}

      <form onSubmit={submit}>
        <SectionCard title="Dane klienta" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
            <SelectField
              label="Typ klienta"
              value={v.type}
              onChange={(e) => set("type", e.target.value)}
            >
              <option value="PRIVATE">{CUSTOMER_TYPE_LABELS.PRIVATE}</option>
              <option value="COMPANY">{CUSTOMER_TYPE_LABELS.COMPANY}</option>
            </SelectField>
            <TextField
              label={v.type === "COMPANY" ? "Nazwa firmy" : "Imię i nazwisko"}
              placeholder={v.type === "COMPANY" ? "Firma Volt sp. z o.o." : "Julia Nowicka"}
              value={v.name}
              onChange={(e) => set("name", e.target.value)}
              error={errors.name}
            />
            <TextField label="Telefon" placeholder="600 100 200" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
            <TextField label="E-mail" type="email" placeholder="ty@example.pl" value={v.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
            <TextField label="Miejscowość" placeholder="Poznań" value={v.city} onChange={(e) => set("city", e.target.value)} />
            <TextField label="Adres (opcjonalnie)" placeholder="ul. Poznańska 14" value={v.address} onChange={(e) => set("address", e.target.value)} />
            {v.type === "COMPANY" && (
              <TextField label="NIP (opcjonalnie)" placeholder="7773334455" value={v.tax_id} onChange={(e) => set("tax_id", e.target.value)} />
            )}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-[12.5px] font-semibold text-ink-2">Notatki</label>
              <textarea
                id="notes"
                rows={3}
                value={v.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent"
                placeholder="Np. preferencje, ustalenia, historia kontaktu…"
              />
            </div>
          </div>
        </SectionCard>

        <div className="mt-4 flex justify-end gap-2.5">
          <SecondaryButton type="button" onClick={() => router.push("/customers")}>Anuluj</SecondaryButton>
          <PrimaryButton type="submit" icon="check" disabled={pending}>
            {pending ? "Zapisywanie…" : isEdit ? "Zapisz zmiany" : "Dodaj klienta"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
