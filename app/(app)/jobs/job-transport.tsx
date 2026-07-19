"use client";
// Transport zlecenia: kalkulacje kosztu paliwa (§33, §34). OWNER dodaje/usuwa.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, TextField, SelectField, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import { fuelCost } from "@/lib/domain/transport";
import type { TransportCalcRecord } from "@/lib/data/transport";
import { createTransportAction, removeTransportAction, computeDistanceAction, type TransportFormValues } from "./transport-actions";

const fmtPLN = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

export function JobTransport({
  jobId, isOwner, calcs, vehicles, defaultFuelPrice,
}: {
  jobId: string;
  isOwner: boolean;
  calcs: TransportCalcRecord[];
  vehicles: { id: string; name: string; consumption: number | null }[];
  defaultFuelPrice: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mapMsg, setMapMsg] = useState<string | null>(null);
  const [v, setV] = useState<TransportFormValues>({ vehicle_id: "", kind: "PLAN", distance_km: "", consumption: "", fuel_price: String(defaultFuelPrice), client_price: "", note: "" });

  const calcFromMap = () => {
    setMapMsg(null);
    startTransition(async () => {
      const res = await computeDistanceAction(jobId);
      if (res.ok && res.km != null) {
        setV((s) => ({ ...s, distance_km: String(res.km) }));
        setMapMsg(`≈ ${res.km} km (${res.minutes} min) · ${res.address ?? ""}`);
      } else {
        setMapMsg(res.error ?? "Błąd");
      }
    });
  };

  const set = <K extends keyof TransportFormValues>(k: K, val: TransportFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const onVehicle = (id: string) => {
    const veh = vehicles.find((x) => x.id === id);
    setV((s) => ({ ...s, vehicle_id: id, consumption: veh?.consumption != null && !s.consumption ? String(veh.consumption) : s.consumption }));
  };

  const preview = fuelCost(Number(v.distance_km.replace(",", ".")) || 0, Number(v.consumption.replace(",", ".")) || 0, Number(v.fuel_price.replace(",", ".")) || 0);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createTransportAction(jobId, v);
      if (res.ok) { setV({ vehicle_id: "", kind: "PLAN", distance_km: "", consumption: "", fuel_price: String(defaultFuelPrice), client_price: "", note: "" }); router.refresh(); return; }
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
                  <div className="text-[13px] font-bold text-ink">{c.kind === "ACTUAL" ? "Wykonanie" : "Plan"}{c.vehicle?.name ? ` · ${c.vehicle.name}` : ""} · {c.distance_km ?? 0} km</div>
                  <div className="text-[12px] text-ink-2">Paliwo: {fmtPLN(c.fuel_cost)}{c.client_price != null ? ` · dla klienta: ${fmtPLN(c.client_price)}` : ""}{c.note ? ` · ${c.note}` : ""}</div>
                </div>
                {isOwner && <button onClick={() => remove(c.id)} disabled={pending} className="rounded-[9px] border border-[#3a1c1f] bg-[#251215] px-2.5 py-1.5 text-[11.5px] font-semibold text-bad">Usuń</button>}
              </div>
            ))}
            <div className="flex justify-end gap-4 text-[12.5px] font-semibold text-ink-2">
              <span>Koszt paliwa: <span className="text-warn">{fmtPLN(totalFuel)}</span></span>
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
            <TextField label="Dystans (km)" inputMode="decimal" placeholder="96" value={v.distance_km} onChange={(e) => set("distance_km", e.target.value)} hint="np. baza→klient→baza ×2 (montaż + demontaż)" />
            <TextField label="Spalanie (l/100km)" inputMode="decimal" placeholder="11.5" value={v.consumption} onChange={(e) => set("consumption", e.target.value)} />
            <TextField label="Cena paliwa (zł/l)" inputMode="decimal" value={v.fuel_price} onChange={(e) => set("fuel_price", e.target.value)} />
            <TextField label="Cena dla klienta (zł)" inputMode="numeric" placeholder="opcjonalnie" value={v.client_price} onChange={(e) => set("client_price", e.target.value)} />
            <div className="col-span-2 flex flex-wrap items-center gap-2">
              <SecondaryButton type="button" onClick={calcFromMap} disabled={pending}>Oblicz z mapy</SecondaryButton>
              {mapMsg && <span className="text-[11.5px] text-ink-2">{mapMsg}</span>}
            </div>
            <div className="col-span-2 flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-ink-2">Szac. koszt paliwa: <span className="text-warn">{fmtPLN(preview)}</span></span>
              <PrimaryButton type="submit" icon="plus" disabled={pending}>{pending ? "Zapisywanie…" : "Dodaj kalkulację"}</PrimaryButton>
            </div>
          </form>
        )}
      </div>
    </SectionCard>
  );
}
