"use client";
// Formularz ustawień aplikacji (§51) — tylko szef.
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
    iclub_hourly_rate: str(initial.iclub_hourly_rate),
    iclub_month_threshold: str(initial.iclub_month_threshold),
    iclub_flat_rate: str(initial.iclub_flat_rate),
    assembly_buffer_minutes: str(initial.assembly_buffer_minutes),
    assembly_addon_minutes: str(initial.assembly_addon_minutes),
    assembly_gastro_minutes: str(initial.assembly_gastro_minutes),
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

      <SectionCard title="Rozliczenia iClub (realizacje w miesiącu)" className="mt-4 p-5">
        <div className="grid grid-cols-1 gap-4 px-5 pb-2 sm:grid-cols-3">
          <TextField label="Pierwszych realizacji = czas wolny" inputMode="numeric" value={v.iclub_month_threshold} onChange={(e) => set("iclub_month_threshold", e.target.value)} error={errors.iclub_month_threshold} hint="np. 4" />
          <TextField label="Stawka czasu wolnego (zł/h)" inputMode="decimal" value={v.iclub_hourly_rate} onChange={(e) => set("iclub_hourly_rate", e.target.value)} error={errors.iclub_hourly_rate} hint="np. 32,40" />
          <TextField label="Ryczałt od kolejnej (zł)" inputMode="decimal" value={v.iclub_flat_rate} onChange={(e) => set("iclub_flat_rate", e.target.value)} error={errors.iclub_flat_rate} hint="np. 500" />
        </div>
        <p className="px-5 pb-5 text-[12px] text-ink-2">
          To parametry dla pracowników w trybie „czas wolny za pierwsze N” (np. Bartek): pierwsze {v.iclub_month_threshold || "4"} realizacji w miesiącu = {v.iclub_hours || "8"} h czasu wolnego (wartość {v.iclub_hours || "8"} h × {v.iclub_hourly_rate || "32,40"} zł), potem ryczałt {v.iclub_flat_rate || "500"} zł + premie. <b>Tryb rozliczenia (czas wolny / ryczałt od pierwszej) oraz premie ustawiasz per pracownik w „Pracownicy”.</b>
        </p>
      </SectionCard>

      <SectionCard title="Czas montażu (sugerowana godzina)" className="mt-4 p-5">
        <div className="grid grid-cols-1 gap-4 px-5 pb-2 sm:grid-cols-3">
          <TextField label="Bufor bezpieczeństwa (min)" inputMode="numeric" value={v.assembly_buffer_minutes} onChange={(e) => set("assembly_buffer_minutes", e.target.value)} error={errors.assembly_buffer_minutes} hint="np. 30" />
          <TextField label="Na każdy dodatek (min)" inputMode="numeric" value={v.assembly_addon_minutes} onChange={(e) => set("assembly_addon_minutes", e.target.value)} error={errors.assembly_addon_minutes} hint="np. 10" />
          <TextField label="Namiot gastronomiczny (min)" inputMode="numeric" value={v.assembly_gastro_minutes} onChange={(e) => set("assembly_gastro_minutes", e.target.value)} error={errors.assembly_gastro_minutes} hint="np. 60" />
        </div>
        <p className="px-5 pb-5 text-[12px] text-ink-2">Sugerowana godzina montażu = start imprezy − (czas montażu pakietu + dodatki + gastro + bufor). Czas montażu pakietu ustawiasz w „Oferta i cennik”.</p>
      </SectionCard>

      <div className="mt-4 flex justify-end">
        <PrimaryButton type="submit" icon="check" disabled={pending || disabled}>{pending ? "Zapisywanie…" : "Zapisz ustawienia"}</PrimaryButton>
      </div>
    </form>
  );
}
