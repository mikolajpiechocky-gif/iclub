"use client";
// §II.14 Pojazd realizacji — pracownik przypisuje go w widoku terenowym; bez pojazdu
// nie da się rozpocząć realizacji (potrzebne do rozliczenia paliwa z faktycznych km).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { assignFieldVehicleAction, removeFieldVehicleAction } from "./actions";

export function FieldVehicle({ jobId, assigned, available }: {
  jobId: string;
  assigned: { id: string; name: string; registration: string | null }[];
  available: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pick, setPick] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErr(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else setErr(r.error ?? "Błąd");
    });
  };

  return (
    <div className={`mb-3.5 rounded-[13px] border p-3.5 ${assigned.length ? "border-border bg-surface" : "border-[#3d3216] bg-[#241e10]"}`}>
      <div className="flex items-center gap-2 text-[12.5px] font-bold text-ink">
        <Icon name="truck" className="h-4 w-4 text-ink-2" />
        {assigned.length ? "Pojazd realizacji" : "Przypisz pojazd (wymagane, by rozpocząć)"}
      </div>
      {assigned.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1.5">
          {assigned.map((v) => (
            <div key={v.id} className="flex items-center gap-2 text-[12.5px]">
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">{v.name}{v.registration ? ` · ${v.registration}` : ""}</span>
              <button onClick={() => run(() => removeFieldVehicleAction(v.id, jobId))} disabled={pending} className="flex-none rounded-[9px] border border-[#3a1c1f] bg-[#251215] px-3 py-1.5 text-[12px] font-bold text-bad disabled:opacity-50">{pending ? "…" : "Usuń"}</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="min-h-[40px] flex-1 rounded-[10px] border border-border bg-surface px-3 text-[13px] text-ink outline-none focus:border-accent">
            <option value="">— wybierz pojazd —</option>
            {available.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <button onClick={() => pick && run(() => assignFieldVehicleAction(jobId, pick))} disabled={pending || !pick} className="rounded-[10px] bg-brand px-3.5 text-[12.5px] font-bold text-white disabled:opacity-40">Przypisz</button>
        </div>
      )}
      {err && <div className="mt-1.5 text-[11px] font-semibold text-bad">{err}</div>}
    </div>
  );
}
