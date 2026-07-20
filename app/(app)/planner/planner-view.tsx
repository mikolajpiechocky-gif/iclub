"use client";
// Planer tras (§37): wybór dnia i pojazdu → optymalna kolejność realizacji,
// dystans, czas i koszt wewnętrzny przejazdu. Optymalizacja przez Routes API.
import { useState, useTransition } from "react";
import { SectionCard, TextField, SelectField, PrimaryButton, Alert } from "@/components/ui";
import { Icon } from "@/components/icons";
import { optimizeRouteAction, type PlannerResult } from "./actions";

const fmtPLN = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);
const fmtTime = (min: number | null | undefined) => {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
};

export function PlannerView({ vehicles, defaultDate }: { vehicles: { id: string; name: string }[]; defaultDate: string }) {
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(defaultDate);
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [result, setResult] = useState<PlannerResult | null>(null);

  const run = () => {
    setResult(null);
    startTransition(async () => {
      setResult(await optimizeRouteAction(date, vehicleId));
    });
  };

  // Trasa w Mapach: baza → przystanki (w kolejności) → baza (zgodnie z wyceną).
  const mapsUrl = result?.stops?.length && result.base
    ? `https://www.google.com/maps/dir/${[result.base, ...result.stops.map((s) => s.address), result.base].map(encodeURIComponent).join("/")}`
    : null;

  return (
    <>
      <SectionCard title="Wybierz dzień i pojazd" className="p-5">
        <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <TextField label="Dzień" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <SelectField label="Pojazd" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.length === 0 && <option value="">— brak pojazdów —</option>}
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </SelectField>
          <PrimaryButton onClick={run} disabled={pending} icon="navigation">{pending ? "Liczenie…" : "Optymalizuj trasę"}</PrimaryButton>
        </div>
      </SectionCard>

      {result && !result.ok && (
        <div className="mt-4"><Alert tone="warn" title="Nie zoptymalizowano">{result.error}</Alert></div>
      )}

      {result?.ok && (
        <SectionCard title="Proponowana trasa" className="mt-4 p-5" action={mapsUrl ? <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold text-accent-soft">Otwórz w Mapach →</a> : undefined}>
          <div className="px-5 pb-5">
            <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] font-semibold text-ink-2">
              <span>Dystans: <span className="text-ink">{result.km} km</span></span>
              <span>Czas jazdy: <span className="text-ink">{fmtTime(result.minutes)}</span></span>
              <span>Paliwo: <span className="text-warn">{fmtPLN(result.fuelCost)}</span></span>
              <span>Eksploatacja: <span className="text-warn">{fmtPLN(result.amortization)}</span></span>
              <span>Koszt wewnętrzny: <span className="text-warn">{fmtPLN(result.internalCost)}</span></span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-3 py-2.5 text-[13px] font-semibold text-ink-2">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-surface-2 text-[12px]"><Icon name="home" className="h-3.5 w-3.5" /></span>
                Baza (start)
              </div>
              {result.stops!.map((s) => (
                <div key={s.seq} className="flex items-center gap-3 border-t border-border-soft py-3">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white">{s.seq}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-bold text-ink">{s.label}</div>
                    <div className="truncate text-[12px] text-ink-2">{s.address}</div>
                  </div>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`} target="_blank" rel="noopener noreferrer" className="flex-none text-[11.5px] font-semibold text-accent-soft">Nawiguj</a>
                </div>
              ))}
              <div className="flex items-center gap-3 border-t border-border-soft py-2.5 text-[13px] font-semibold text-ink-2">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-surface-2 text-[12px]"><Icon name="home" className="h-3.5 w-3.5" /></span>
                Powrót do bazy
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </>
  );
}
