"use client";
// Formularz ustawień aplikacji (§51) — tylko właściciel.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, TextField, PrimaryButton, Alert } from "@/components/ui";
import type { AppSettings } from "@/lib/data/settings";
import { updateSettingsAction, type SettingsFormValues } from "./actions";

const str = (v: number | string) => String(v);

export function SettingsForm({ initial, disabled }: { initial: AppSettings; disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [v, setV] = useState<SettingsFormValues>({
    base_address: initial.base_address,
    fuel_price_petrol: str(initial.fuel_price_petrol),
    fuel_price_diesel: str(initial.fuel_price_diesel),
    fuel_price_lpg: str(initial.fuel_price_lpg),
    amortization_per_km: str(initial.amortization_per_km),
    iclub_hours: str(initial.iclub_hours),
    vat_rate: str(initial.vat_rate),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof SettingsFormValues>(k: K, val: SettingsFormValues[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    setSaved(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await updateSettingsAction(v);
      if (res.ok) { setSaved(true); router.refresh(); return; }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) setFormError(res.error);
    });
  };

  return (
    <form onSubmit={submit}>
      {formError && <div className="mb-4"><Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert></div>}
      {saved && <div className="mb-4"><Alert tone="ok" title="Zapisano">Ustawienia zaktualizowane.</Alert></div>}

      <SectionCard title="Baza (magazyn)" className="p-5">
        <div className="px-5 pb-5">
          <TextField label="Adres bazy" placeholder="Południowa 9, Dopiewo" value={v.base_address} onChange={(e) => set("base_address", e.target.value)} error={errors.base_address} />
          <p className="mt-2 text-[12px] text-ink-2">Punkt startowy tras i liczenia kilometrów w transporcie.</p>
        </div>
      </SectionCard>

      <SectionCard title="Ceny paliwa (zł/l)" className="mt-4 p-5">
        <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-3">
          <TextField label="Benzyna" inputMode="decimal" value={v.fuel_price_petrol} onChange={(e) => set("fuel_price_petrol", e.target.value)} error={errors.fuel_price_petrol} />
          <TextField label="Diesel" inputMode="decimal" value={v.fuel_price_diesel} onChange={(e) => set("fuel_price_diesel", e.target.value)} error={errors.fuel_price_diesel} />
          <TextField label="LPG" inputMode="decimal" value={v.fuel_price_lpg} onChange={(e) => set("fuel_price_lpg", e.target.value)} error={errors.fuel_price_lpg} />
        </div>
      </SectionCard>

      <SectionCard title="Transport" className="mt-4 p-5">
        <div className="grid grid-cols-1 gap-4 px-5 pb-2 sm:grid-cols-2">
          <TextField label="Eksploatacja auta (zł/km)" inputMode="decimal" value={v.amortization_per_km} onChange={(e) => set("amortization_per_km", e.target.value)} error={errors.amortization_per_km} />
        </div>
        <p className="px-5 pb-5 text-[12px] text-ink-2">Koszt bieżący auta bez paliwa (opony, serwis, płyny). Koszt wewnętrzny transportu = paliwo + eksploatacja × km.</p>
      </SectionCard>

      <SectionCard title="Rozliczenia" className="mt-4 p-5">
        <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
          <TextField label="Godziny na realizację iClub" inputMode="decimal" value={v.iclub_hours} onChange={(e) => set("iclub_hours", e.target.value)} error={errors.iclub_hours} />
          <TextField label="Stawka VAT (%)" inputMode="decimal" value={v.vat_rate} onChange={(e) => set("vat_rate", e.target.value)} error={errors.vat_rate} />
        </div>
        <p className="px-5 pb-5 text-[12px] text-ink-2">Godziny służą do wyliczeń stawki godzinowej. VAT wykorzysta moduł faktur.</p>
      </SectionCard>

      <div className="mt-4 flex justify-end">
        <PrimaryButton type="submit" icon="check" disabled={pending || disabled}>{pending ? "Zapisywanie…" : "Zapisz ustawienia"}</PrimaryButton>
      </div>
    </form>
  );
}
