"use client";
// Formularz stawek/premii pracownika (tylko OWNER). §10 instrukcji master.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import type { EmployeeWithRate } from "@/lib/data/types";
import { ICLUB_SETTLEMENT_MODE_LABELS, type IclubSettlementMode } from "@/lib/data/types";
import { saveEmployeeRateAction, type RateFormValues } from "./actions";

const str = (v: number | null | undefined) => (v == null ? "" : String(v));

export function RateForm({ employee }: { employee: EmployeeWithRate }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const r = employee.rate;

  const [v, setV] = useState<RateFormValues>({
    rate_model: r?.rate_model ?? "FLAT",
    hourly_rate: str(r?.hourly_rate),
    iclub_flat: str(r?.iclub_flat),
    far_bonus: str(r?.far_bonus),
    gastro_bonus: str(r?.gastro_bonus),
    review_bonus: str(r?.review_bonus),
    reel_bonus: str(r?.reel_bonus),
    upsell_percent: r?.upsell_percent != null ? String(r.upsell_percent) : "15",
    iclub_settlement_mode: r?.iclub_settlement_mode ?? "FLAT",
    iclub_threshold: str(r?.iclub_threshold),
    iclub_free_hours: str(r?.iclub_free_hours),
    iclub_free_hourly: str(r?.iclub_free_hourly),
    notes: r?.notes ?? "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof RateFormValues>(k: K, val: RateFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveEmployeeRateAction(employee.id, v);
      if (res.ok) {
        setSaved(true);
        router.refresh();
        return;
      }
      if (res.error) setFormError(res.error);
    });
  };

  return (
    <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
      <PageHeader
        title={employee.full_name || "Pracownik"}
        subtitle="Model rozliczenia, stawki i premie"
        back={{ href: "/employees", label: "Pracownicy" }}
      />

      {formError && <div className="mb-4"><Alert tone="bad" title="Nie udało się zapisać">{formError}</Alert></div>}
      {saved && <div className="mb-4"><Alert tone="ok" title="Zapisano">Stawki zostały zapisane.</Alert></div>}

      <form onSubmit={submit}>
        <SectionCard title="Model rozliczenia i stawki" className="p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-2 sm:grid-cols-2">
            <SelectField label="Rozliczenie iClub" value={v.iclub_settlement_mode} onChange={(e) => set("iclub_settlement_mode", e.target.value as IclubSettlementMode)}>
              {(Object.keys(ICLUB_SETTLEMENT_MODE_LABELS) as IclubSettlementMode[]).map((m) => <option key={m} value={m}>{ICLUB_SETTLEMENT_MODE_LABELS[m]}</option>)}
            </SelectField>
            <TextField
              label="Ile realizacji obejmuje umowa (N)"
              inputMode="numeric"
              placeholder="4"
              value={v.iclub_threshold}
              onChange={(e) => set("iclub_threshold", e.target.value)}
              disabled={v.iclub_settlement_mode !== "THRESHOLD"}
              hint={v.iclub_settlement_mode === "THRESHOLD"
                ? "Pierwsze N realizacji w miesiącu = dzień wolny; kolejne = ryczałt. Puste = próg z Ustawień."
                : "Dotyczy trybu „Czas wolny za pierwsze N”. Wybierz ten tryb powyżej, aby ustawić N."}
            />
            <TextField
              label="Czas wolny — godziny za realizację"
              inputMode="numeric"
              placeholder="8"
              value={v.iclub_free_hours}
              onChange={(e) => set("iclub_free_hours", e.target.value)}
              disabled={v.iclub_settlement_mode !== "THRESHOLD"}
              hint="Ile godzin czasu wolnego = 1 realizacja w umowie (8 h = 1 dzień). Puste = globalne z Ustawień."
            />
            <TextField
              label="Czas wolny — stawka (zł/h)"
              inputMode="numeric"
              placeholder="32,40"
              value={v.iclub_free_hourly}
              onChange={(e) => set("iclub_free_hourly", e.target.value)}
              disabled={v.iclub_settlement_mode !== "THRESHOLD"}
              hint="Stawka za godzinę czasu wolnego. Puste = globalna z Ustawień."
            />
            <TextField label="Ryczałt za realizację iClub (zł)" inputMode="numeric" placeholder="500" value={v.iclub_flat} onChange={(e) => set("iclub_flat", e.target.value)} hint="Kwota za realizację (ryczałt / po progu). Puste = globalny z Ustawień." />
            <TextField label="Stawka godzinowa — wypożyczalnia (zł/h)" inputMode="numeric" placeholder="40" value={v.hourly_rate} onChange={(e) => set("hourly_rate", e.target.value)} hint="Domyślne rozliczenie wypożyczalni. Ryczałt na konkretne zlecenie ustawiasz w rezerwacji." />
            <TextField label="Premia za dosprzedaż (%)" inputMode="numeric" placeholder="15" value={v.upsell_percent} onChange={(e) => set("upsell_percent", e.target.value)} />
          </div>
          <p className="px-5 pb-5 text-[12px] text-ink-2">
            „Czas wolny za pierwsze N” (Bartek): pierwsze N realizacji iClub w miesiącu = dzień wolny (godziny × stawka ustawione powyżej), potem ryczałt + premie. „Ryczałt od pierwszej”: każda realizacja iClub = ryczałt + premie. Puste pola = wartości globalne z Ustawień → „Rozliczenia iClub”.
          </p>
        </SectionCard>

        <SectionCard title="Premie" className="mt-4 p-5">
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
            <TextField label="Daleki wyjazd (zł)" inputMode="numeric" placeholder="100" value={v.far_bonus} onChange={(e) => set("far_bonus", e.target.value)} hint="Doliczany tylko do realizacji w ramach umowy (pierwsze N = czas wolny). Poza umową (ryczałt) — nie." />
            <TextField label="Namiot gastronomiczny (zł)" inputMode="numeric" placeholder="80" value={v.gastro_bonus} onChange={(e) => set("gastro_bonus", e.target.value)} />
            <TextField label="Opinia (zł)" inputMode="numeric" placeholder="30" value={v.review_bonus} onChange={(e) => set("review_bonus", e.target.value)} />
            <TextField label="Rolka (zł)" inputMode="numeric" placeholder="30" value={v.reel_bonus} onChange={(e) => set("reel_bonus", e.target.value)} />
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-[12.5px] font-semibold text-ink-2">Notatki</label>
              <textarea id="notes" rows={2} value={v.notes} onChange={(e) => set("notes", e.target.value)} className="rounded-field border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-accent" placeholder="Ustalenia, wyjątki…" />
            </div>
          </div>
        </SectionCard>

        <div className="mt-4 flex justify-end gap-2.5">
          <SecondaryButton type="button" onClick={() => router.push("/employees")}>Wróć</SecondaryButton>
          <PrimaryButton type="submit" icon="check" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz stawki"}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}
