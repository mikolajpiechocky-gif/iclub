"use client";
// Formularz cennika (§51) — ceny pakietów i dodatków. Tylko właściciel.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, PrimaryButton, Alert } from "@/components/ui";
import type { PackageRecord, AddonRecord } from "@/lib/data/types";
import { updatePricingAction } from "./actions";

type Row = { id: string; name: string; description?: string | null; price: string };

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

  const [pkg, setPkg] = useState<Row[]>(
    packages.map((p) => ({ id: p.id, name: p.name, description: p.description, price: String(p.base_price ?? 0) })),
  );
  const [add, setAdd] = useState<Row[]>(
    addons.map((a) => ({ id: a.id, name: a.name, price: String(a.price ?? 0) })),
  );

  const setRow = (which: "pkg" | "add", id: string, price: string) => {
    setSaved(false);
    const upd = (rows: Row[]) => rows.map((r) => (r.id === id ? { ...r, price } : r));
    if (which === "pkg") setPkg(upd);
    else setAdd(upd);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const res = await updatePricingAction({
        packages: pkg.map(({ id, price }) => ({ id, price })),
        addons: add.map(({ id, price }) => ({ id, price })),
      });
      if (res.ok) { setSaved(true); router.refresh(); return; }
      if (res.fieldErrors) setErrors(res.fieldErrors);
      if (res.error) setFormError(res.error);
    });
  };

  const priceInput = (which: "pkg" | "add", r: Row) => (
    <div className="flex items-center gap-2">
      <input
        inputMode="decimal"
        value={r.price}
        onChange={(e) => setRow(which, r.id, e.target.value)}
        className={`w-28 rounded-[10px] border bg-surface px-3 py-2 text-right text-[14px] font-semibold text-ink outline-none focus:border-brand ${errors[r.id] ? "border-bad" : "border-border"}`}
      />
      <span className="text-[12px] font-semibold text-ink-2">zł</span>
    </div>
  );

  return (
    <form onSubmit={submit}>
      {formError && <div className="mb-4"><Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert></div>}
      {saved && <div className="mb-4"><Alert tone="ok" title="Zapisano">Cennik zaktualizowany. Nowe rezerwacje podpowiedzą te ceny.</Alert></div>}

      <SectionCard title="Pakiety" className="p-5">
        <div className="flex flex-col divide-y divide-border-soft px-5 pb-2">
          {pkg.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="text-[14px] font-bold text-ink">{r.name}</div>
                {r.description && <div className="truncate text-[12px] text-ink-2">{r.description}</div>}
                {errors[r.id] && <div className="text-[11px] font-semibold text-bad">{errors[r.id]}</div>}
              </div>
              {priceInput("pkg", r)}
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
              {priceInput("add", r)}
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
