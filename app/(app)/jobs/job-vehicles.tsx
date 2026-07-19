"use client";
// Pojazdy przypisane do zlecenia (§31, §35). OWNER przypisuje/usuwa.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, PrimaryButton, Alert } from "@/components/ui";
import { assignVehicleAction, removeJobVehicleAction } from "../vehicles/actions";

export interface JobVehicleView {
  id: string;
  vehicle_id: string;
  name: string;
  registration: string | null;
}

export function JobVehicles({
  jobId, isOwner, assigned, available, conflicts,
}: {
  jobId: string;
  isOwner: boolean;
  assigned: JobVehicleView[];
  available: { id: string; name: string }[];
  conflicts: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pick, setPick] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else if (res.error) setError(res.error);
    });
  };

  return (
    <SectionCard title="Pojazdy" className="mt-4 p-5">
      <div className="px-5 pb-5">
        {error && <div className="mb-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}
        {conflicts.length > 0 && (
          <div className="mb-3"><Alert tone="warn" title="Możliwy konflikt pojazdu">Pojazd jest przypisany też do: {conflicts.join("; ")}. Sprawdź terminy.</Alert></div>
        )}

        {assigned.length === 0 ? (
          <p className="text-[13px] text-ink-2">Brak przypisanych pojazdów.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {assigned.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-[13px] border border-border bg-surface-2 px-3.5 py-3">
                <div className="flex-1"><span className="text-[13.5px] font-bold text-ink">{v.name}</span> <span className="text-[12px] text-ink-2">{v.registration ?? ""}</span></div>
                {isOwner && <button onClick={() => run(() => removeJobVehicleAction(v.id, jobId))} disabled={pending} className="rounded-[9px] border border-[#3a1c1f] bg-[#251215] px-2.5 py-1.5 text-[11.5px] font-semibold text-bad">Usuń</button>}
              </div>
            ))}
          </div>
        )}

        {isOwner && available.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-end gap-2.5">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="veh" className="text-[12px] font-semibold text-ink-2">Przypisz pojazd</label>
              <select id="veh" value={pick} onChange={(e) => setPick(e.target.value)} className="min-h-[44px] rounded-field border border-border bg-surface-2 px-3 text-[14px] text-ink outline-none focus:border-accent">
                <option value="">— wybierz —</option>
                {available.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <PrimaryButton onClick={() => pick && run(() => assignVehicleAction(jobId, pick))} disabled={pending || !pick}>Przypisz</PrimaryButton>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
