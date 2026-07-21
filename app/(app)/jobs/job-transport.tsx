"use client";
// Transport zlecenia: kalkulacje kosztu paliwa (§33, §34). OWNER dodaje/usuwa.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import { fuelCost, amortizationCost, fuelPriceForType, plannedKm, tripClass, clientTransportPrice, type FuelPrices } from "@/lib/domain/transport";
import type { TransportCalcRecord } from "@/lib/data/transport";
import { createTransportAction, removeTransportAction, computeDistanceAction, type TransportFormValues } from "./transport-actions";

const fmtPLN = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

export function JobTransport({
  jobId, isOwner, calcs, vehicles, fuelPrices, amortizationPerKm,
}: {
  jobId: string;
  isOwner: boolean;
  calcs: TransportCalcRecord[];
  vehicles: { id: string; name: string; consumption: number | null; fuel_type: string | null }[];
  fuelPrices: FuelPrices;
  amortizationPerKm: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mapMsg, setMapMsg] = useState<string | null>(null);
  const [v, setV] = useState<TransportFormValues>({ vehicle_id: "", kind: "PLAN", distance_km: "", returns_to_base: false, consumption: "", fuel_price: String(fuelPrices.diesel), client_price: "", note: "" });

  const calcFromMap = () => {
    setMapMsg(null);
    startTransition(async () => {
      const res = await computeDistanceAction(jobId);
      if (res.ok && res.km != null) {
        setV((s) => ({ ...s, distance_km: String(res.km), client_price: res.clientPrice != null ? String(res.clientPrice) : s.client_price }));
        setMapMsg(`W jedną stronę ≈ ${res.km} km (${res.minutes} min) · ${res.farTrip ? "daleki (>100 km)" : "bliski (≤100 km)"}${res.clientPrice != null ? ` · widełki: ${res.clientPrice} zł` : " · >400 km → wycena indywidualna"} · ${res.address ?? ""}`);
      } else {
        setMapMsg(res.error ?? "Błąd");
      }
    });
  };

  const set = <K extends keyof TransportFormValues>(k: K, val: TransportFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const onVehicle = (id: string) => {
    const veh = vehicles.find((x) => x.id === id);
    setV((s) => ({
      ...s,
      vehicle_id: id,
      consumption: veh?.consumption != null && !s.consumption ? String(veh.consumption) : s.consumption,
      // Cena paliwa dobrana wg typu pojazdu (benzyna/diesel/LPG) z Ustawień.
      fuel_price: veh ? String(fuelPriceForType(veh.fuel_type, fuelPrices)) : s.fuel_price,
    }));
  };

  const oneWayKm = Number(v.distance_km.replace(",", ".")) || 0;
  const previewFar = tripClass(oneWayKm) === "far";
  const returnAllowed = oneWayKm > 0 && oneWayKm <= 100; // §16.3 powrót do bazy tylko dla bliskich (≤100 km)
  const previewPlanned = plannedKm(oneWayKm, returnAllowed && v.returns_to_base);
  const preview = fuelCost(previewPlanned, Number(v.consumption.replace(",", ".")) || 0, Number(v.fuel_price.replace(",", ".")) || 0);
  const previewAmort = amortizationCost(previewPlanned, amortizationPerKm);
  const previewInternal = Math.round((preview + previewAmort) * 100) / 100;
  const previewClient = clientTransportPrice(oneWayKm);

  // §16.3: powrót do bazy tylko dla bliskich tras — dla dalekich wymuś "zostaje na miejscu".
  const effReturns = returnAllowed && v.returns_to_base;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTransportAction(jobId, { ...v, returns_to_base: effReturns });
      if (res.ok) { setV({ vehicle_id: "", kind: "PLAN", distance_km: "", returns_to_base: false, consumption: "", fuel_price: String(fuelPrices.diesel), client_price: "", note: "" }); router.refresh(); return; }
      setError(res.error ?? "Błąd");
    });
  };
  const remove = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await removeTransportAction(id, jobId);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Błąd");
    });
  };

  const totalFuel = calcs.reduce((s, c) => s + Number(c.fuel_cost || 0), 0);
  const totalAmort = calcs.reduce((s, c) => s + Number(c.amortization || 0), 0);
  const totalInternal = totalFuel + totalAmort;
  const totalClient = calcs.reduce((s, c) => s + Number(c.client_price || 0), 0);

  return (
    <SectionCard title="Transport i paliwo" className="mt-4 p-5">
      <div className="px-5 pb-5">
        {error && <div className="mb-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

        {calcs.length > 0 && (
          <div className="mb-4 flex flex-col gap-2.5">
            {calcs.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-[13px] border border-border bg-surface-2 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-ink">{c.kind === "ACTUAL" ? "Wykonanie" : "Plan"}{c.vehicle?.name ? ` · ${c.vehicle.name}` : ""} · {c.distance_km ?? 0} km{c.one_way_km != null ? ` (${c.one_way_km} km × ${c.returns_to_base ? 4 : 2})` : ""}</div>
                  <div className="text-[12px] text-ink-2">Paliwo: {fmtPLN(c.fuel_cost)} · ekspl.: {fmtPLN(c.amortization)} · wewn.: {fmtPLN(Number(c.fuel_cost || 0) + Number(c.amortization || 0))}{c.client_price != null ? ` · dla klienta: ${fmtPLN(c.client_price)}` : ""}{c.note ? ` · ${c.note}` : ""}</div>
                </div>
                {isOwner && <button onClick={() => remove(c.id)} disabled={pending} className="rounded-[9px] border border-[#3a1c1f] bg-[#251215] px-2.5 py-1.5 text-[11.5px] font-semibold text-bad">Usuń</button>}
              </div>
            ))}
            <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-[12.5px] font-semibold text-ink-2">
              <span>Paliwo: <span className="text-warn">{fmtPLN(totalFuel)}</span></span>
              <span>Eksploatacja: <span className="text-warn">{fmtPLN(totalAmort)}</span></span>
              <span>Koszt wewnętrzny: <span className="text-warn">{fmtPLN(totalInternal)}</span></span>
              {totalClient > 0 && <span>Dla klienta: <span className="text-ok">{fmtPLN(totalClient)}</span></span>}
            </div>
          </div>
        )}

        {isOwner && (
          <form onSubmit={add} className="grid grid-cols-2 gap-3">
            <SelectField label="Pojazd" value={v.vehicle_id} onChange={(e) => onVehicle(e.target.value)}>
              <option value="">— wybierz —</option>
              {vehicles.map((veh) => <option key={veh.id} value={veh.id}>{veh.name}</option>)}
            </SelectField>
            <SelectField label="Rodzaj" value={v.kind} onChange={(e) => set("kind", e.target.value)}>
              <option value="PLAN">Plan</option>
              <option value="ACTUAL">Wykonanie</option>
            </SelectField>
            <TextField label="Odległość w jedną stronę (km)" inputMode="decimal" placeholder="96" value={v.distance_km} onChange={(e) => set("distance_km", e.target.value)} hint="baza → klient (D). Planowane km liczone automatycznie ×2 lub ×4." />
            <TextField label="Spalanie (l/100km)" inputMode="decimal" placeholder="11.5" value={v.consumption} onChange={(e) => set("consumption", e.target.value)} />
            <TextField label="Cena paliwa (zł/l)" inputMode="decimal" value={v.fuel_price} onChange={(e) => set("fuel_price", e.target.value)} />
            <TextField label="Cena dla klienta (zł)" inputMode="numeric" placeholder={previewClient != null ? `widełki: ${previewClient}` : "wycena indywidualna"} value={v.client_price} onChange={(e) => set("client_price", e.target.value)} hint={oneWayKm > 0 ? (previewClient != null ? `${previewFar ? "Daleki" : "Bliski"} · widełki ${previewClient} zł` : "> 400 km → wycena indywidualna") : undefined} />
            <label className={`col-span-2 flex items-center gap-2.5 rounded-[11px] border px-3.5 py-2.5 text-[12.5px] ${returnAllowed ? "cursor-pointer border-border bg-surface-2 text-ink" : "border-border bg-surface-2 text-ink-2 opacity-60"}`}>
              <input type="checkbox" checked={effReturns} disabled={!returnAllowed} onChange={(e) => set("returns_to_base", e.target.checked)} className="h-4 w-4 accent-brand" />
              <span>
                Auto wraca do bazy między montażem a demontażem <span className="font-semibold">(D×4)</span>
                <span className="block text-[11px] text-ink-2">{returnAllowed ? "Bliska trasa — pracownik może wrócić do bazy i przyjechać ponownie." : oneWayKm > 100 ? "Daleka trasa (>100 km) — auto zostaje na miejscu (D×2)." : "Podaj odległość, aby wybrać wariant."}</span>
              </span>
            </label>
            <div className="col-span-2 flex flex-wrap items-center gap-2">
              <SecondaryButton type="button" onClick={calcFromMap} disabled={pending}>Oblicz z mapy</SecondaryButton>
              {mapMsg && <span className="text-[11.5px] text-ink-2">{mapMsg}</span>}
            </div>
            <div className="col-span-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12.5px] font-semibold text-ink-2">
                Plan {previewPlanned} km {oneWayKm > 0 ? `(D×${effReturns ? 4 : 2})` : ""} · paliwo <span className="text-warn">{fmtPLN(preview)}</span> + eksploatacja <span className="text-warn">{fmtPLN(previewAmort)}</span> = <span className="text-warn">{fmtPLN(previewInternal)}</span>
              </span>
              <PrimaryButton type="submit" icon="plus" disabled={pending}>{pending ? "Zapisywanie…" : "Dodaj kalkulację"}</PrimaryButton>
            </div>
          </form>
        )}
      </div>
    </SectionCard>
  );
}
