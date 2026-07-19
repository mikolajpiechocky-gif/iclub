"use client";
// Formularz pojazdu (dodawanie / edycja).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import type { VehicleRecord } from "@/lib/data/types";
import { createVehicleAction, updateVehicleAction, type VehicleFormValues } from "./actions";

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));

export function VehicleForm({ initial }: { initial?: VehicleRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(initial);

  const [v, setV] = useState<VehicleFormValues>({
    name: initial?.name ?? "",
    registration: str(initial?.registration),
    type: initial?.type ?? "Bus",
    fuel_type: initial?.fuel_type ?? "Diesel",
    consumption: str(initial?.consumption),
    capacity: str(initial?.capacity),
    mileage: str(initial?.mileage),
    insurance_date: str(initial?.insurance_date),
    inspection_date: str(initial?.inspection_date),
    notes: str(initial?.notes),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof VehicleFormValues>(k: K, val: VehicleFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = isEdit ? await updateVehicleAction(initial!.id, v) : await createVehicleAction(v);
      if (res.ok) { router.push("/vehicles"); router.refresh(); return; }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) setFormError(res.error);
    });
  };

  return (
    <div className="mx-auto max-w-[760px] px-5 py-6 md:px-8">
      <PageHeader title={isEdit ? "Edycja pojazdu" : "Nowy pojazd"} subtitle={isEdit ? initial!.name : "Dodaj pojazd do floty"} back={{ href: "/vehicles", label: "Flota" }} />
      {formError && <div className="mb-4"><Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert></div>}
      <form onSubmit={submit}>
        <SectionCard title="Dane pojazdu" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
            <TextField label="Nazwa" placeholder="Iveco Daily" value={v.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
            <TextField label="Rejestracja" placeholder="PO 00000" value={v.registration} onChange={(e) => set("registration", e.target.value)} />
            <SelectField label="Typ" value={v.type} onChange={(e) => set("type", e.target.value)}>
              {["Bus", "Ciężarowy", "Osobowy", "Inny"].map((t) => <option key={t} value={t}>{t}</option>)}
            </SelectField>
            <SelectField label="Paliwo" value={v.fuel_type} onChange={(e) => set("fuel_type", e.target.value)}>
              {["Diesel", "Benzyna", "LPG"].map((t) => <option key={t} value={t}>{t}</option>)}
            </SelectField>
            <TextField label="Spalanie (l/100km)" inputMode="decimal" placeholder="11.5" value={v.consumption} onChange={(e) => set("consumption", e.target.value)} />
            <TextField label="Ładowność" placeholder="do 3.5 t" value={v.capacity} onChange={(e) => set("capacity", e.target.value)} />
            <TextField label="Przebieg (km)" inputMode="numeric" placeholder="184000" value={v.mileage} onChange={(e) => set("mileage", e.target.value)} />
            <TextField label="Ubezpieczenie do" type="date" value={v.insurance_date} onChange={(e) => set("insurance_date", e.target.value)} />
            <TextField label="Przegląd do" type="date" value={v.inspection_date} onChange={(e) => set("inspection_date", e.target.value)} />
            <div className="sm:col-span-2"><TextField label="Notatki" value={v.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          </div>
        </SectionCard>
        <div className="mt-4 flex justify-end gap-2.5">
          <SecondaryButton type="button" onClick={() => router.push("/vehicles")}>Anuluj</SecondaryButton>
          <PrimaryButton type="submit" icon="check" disabled={pending}>{pending ? "Zapisywanie…" : isEdit ? "Zapisz" : "Dodaj pojazd"}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}
