"use client";
// Formularz cennika (§51) — ceny pakietów (mały/duży namiot) i dodatków. Tylko szef.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, PrimaryButton, Alert } from "@/components/ui";
import type { PackageRecord, AddonRecord } from "@/lib/data/types";
import { updatePricingAction } from "./actions";

type PkgRow = { id: string; name: string; description?: string | null; priceSmall: string; priceBig: string; assembly: string; active: boolean };
type AddRow = { id: string; name: string; price: string };

export function PricingForm({
  packages,
  addons,
  disabled,
}: {
  packages: PackageRecord[];
  addons: AddonRecord[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [pkg, setPkg] = useState<PkgRow[]>(
    packages.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceSmall: String(p.price_small ?? p.base_price ?? 0),
      priceBig: String(p.price_big ?? p.base_price ?? 0),
      assembly: String(p.assembly_minutes ?? 180),
      active: p.active,
    })),
  );
  const [add, setAdd] = useState<AddRow[]>(addons.map((a) => ({ id: a.id, name: a.name, price: String(a.price ?? 0) })));

  const setPkgField = (id: string, field: "priceSmall" | "priceBig" | "assembly", val: string) => {
    setSaved(false);
    setPkg((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  };
  const setPkgActive = (id: string, active: boolean) => {
    setSaved(false);
    setPkg((rows) => rows.map((r) => (r.id === id ? { ...r, active } : r)));
  };
  const setAddPrice = (id: string, price: string) => {
    setSaved(false);
    setAdd((rows) => rows.map((r) => (r.id === id ? { ...r, price } : r)));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await updatePricingAction({
        packages: pkg.map(({ id, priceSmall, priceBig, assembly, active }) => ({ id, priceSmall, priceBig, assembly, active })),
        addons: add.map(({ id, price }) => ({ id, price })),
      });
      if (res.ok) { setSaved(true); router.refresh(); return; }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) setFormError(res.error);
    });
  };

  const priceBox = (value: string, onChange: (v: string) => void, label: string, bad: boolean) => (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.4px] text-ink-2">{label}</span>
      <div className="flex items-center gap-1.5">
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={`w-24 rounded-[10px] border bg-surface px-3 py-2 text-right text-[14px] font-semibold text-ink outline-none focus:border-brand ${bad ? "border-bad" : "border-border"}`} />
        <span className="text-[12px] font-semibold text-ink-2">zł</span>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit}>
      {formError && <div className="mb-4"><Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert></div>}
      {saved && <div className="mb-4"><Alert tone="ok" title="Zapisano">Cennik zaktualizowany. Nowe rezerwacje podpowiedzą te ceny.</Alert></div>}

      <SectionCard title="Pakiety" className="p-5">
        <p className="px-5 pb-1 text-[12px] text-ink-2">Cena zależy od wielkości namiotu — podaj osobno dla małego i dużego.</p>
        <div className="flex flex-col divide-y divide-border-soft px-5 pb-2">
          {pkg.map((r) => (
            <div key={r.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${!r.active ? "opacity-55" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-ink">{r.name}</span>
                  {!r.active && <span className="rounded-[6px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-2">Nieaktywny</span>}
                </div>
                {r.description && <div className="truncate text-[12px] text-ink-2">{r.description}</div>}
                <label className="mt-1 inline-flex cursor-pointer items-center gap-1.5 text-[11.5px] font-semibold text-ink-2">
                  <input type="checkbox" checked={r.active} onChange={(e) => setPkgActive(r.id, e.target.checked)} className="h-3.5 w-3.5 accent-accent" />
                  Aktywny (widoczny w nowych rezerwacjach)
                </label>
                {errors[r.id] && <div className="text-[11px] font-semibold text-bad">{errors[r.id]}</div>}
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex items-center gap-2">
                  <input inputMode="numeric" value={r.assembly} onChange={(e) => setPkgField(r.id, "assembly", e.target.value)} className="w-16 rounded-[10px] border border-border bg-surface px-3 py-2 text-right text-[14px] font-semibold text-ink outline-none focus:border-brand" aria-label="Czas montażu (minuty)" />
                  <span className="text-[12px] font-semibold text-ink-2">min</span>
                </div>
                {priceBox(r.priceSmall, (v) => setPkgField(r.id, "priceSmall", v), "Mały namiot", Boolean(errors[r.id]))}
                {priceBox(r.priceBig, (v) => setPkgField(r.id, "priceBig", v), "Duży namiot", Boolean(errors[r.id]))}
              </div>
            </div>
          ))}
          {pkg.length === 0 && <div className="py-3 text-[13px] text-ink-2">Brak pakietów.</div>}
        </div>
      </SectionCard>

      <SectionCard title="Dodatki" className="mt-4 p-5">
        <div className="flex flex-col divide-y divide-border-soft px-5 pb-2">
          {add.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="text-[14px] font-bold text-ink">{r.name}</div>
                {errors[r.id] && <div className="text-[11px] font-semibold text-bad">{errors[r.id]}</div>}
              </div>
              <div className="flex items-center gap-2">
                <input inputMode="decimal" value={r.price} onChange={(e) => setAddPrice(r.id, e.target.value)} className={`w-28 rounded-[10px] border bg-surface px-3 py-2 text-right text-[14px] font-semibold text-ink outline-none focus:border-brand ${errors[r.id] ? "border-bad" : "border-border"}`} />
                <span className="text-[12px] font-semibold text-ink-2">zł</span>
              </div>
            </div>
          ))}
          {add.length === 0 && <div className="py-3 text-[13px] text-ink-2">Brak dodatków.</div>}
        </div>
      </SectionCard>

      <div className="mt-4 flex justify-end">
        <PrimaryButton type="submit" icon="check" disabled={pending || disabled}>{pending ? "Zapisywanie…" : "Zapisz cennik"}</PrimaryButton>
      </div>
    </form>
  );
}
