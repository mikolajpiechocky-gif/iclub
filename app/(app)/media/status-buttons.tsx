"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { IncidentStatus } from "@/lib/data/types";
import { setIncidentStatusAction, setIncidentResolutionAction, convertIncidentToServiceAction } from "./actions";

export function IncidentStatusButtons({ id, status, resolution, equipment, category, description }: { id: string; status: IncidentStatus; resolution: string | null; equipment: string | null; category: string; description: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [resp, setResp] = useState(resolution ?? "");
  const [open, setOpen] = useState(false);

  const go = (next: IncidentStatus) => {
    setErr(null);
    startTransition(async () => {
      const res = await setIncidentStatusAction(id, next);
      if (res.ok) router.refresh();
      else setErr(res.error ?? "Błąd");
    });
  };
  const convert = () => {
    if (typeof window !== "undefined" && !window.confirm("Przekształcić w zadanie (serwis/rozwój) i zamknąć zgłoszenie?")) return;
    setErr(null);
    startTransition(async () => {
      const res = await convertIncidentToServiceAction(id, equipment, category, description);
      if (res.ok) router.refresh();
      else setErr(res.error ?? "Błąd");
    });
  };
  const saveResp = () => {
    setErr(null);
    startTransition(async () => {
      const res = await setIncidentResolutionAction(id, resp);
      if (res.ok) { setOpen(false); router.refresh(); }
      else setErr(res.error ?? "Błąd");
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <button onClick={() => setOpen((o) => !o)} disabled={pending} className="rounded-[9px] border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2">Odpowiedz</button>
        <button onClick={convert} disabled={pending} className="rounded-[9px] border border-[#2b3320] bg-[#141b12] px-2.5 py-1.5 text-[11.5px] font-semibold text-ok">→ Zadanie</button>
        {status === "OPEN" && <button onClick={() => go("IN_PROGRESS")} disabled={pending} className="rounded-[9px] border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2">Podejmij</button>}
        {status === "IN_PROGRESS" && <button onClick={() => go("RESOLVED")} disabled={pending} className="rounded-[9px] bg-[#22c55e] px-2.5 py-1.5 text-[11.5px] font-bold text-[#08170d]">Zamknij</button>}
        {status === "RESOLVED" && <button onClick={() => go("OPEN")} disabled={pending} className="rounded-[9px] border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2">Otwórz ponownie</button>}
      </div>
      {open && (
        <div className="mt-1 flex w-full max-w-[260px] flex-col gap-1.5">
          <textarea rows={2} value={resp} onChange={(e) => setResp(e.target.value)} placeholder="Odpowiedź szefa…" className="w-full rounded-[9px] border border-border bg-surface-2 px-2.5 py-2 text-[12px] text-ink outline-none focus:border-accent" />
          <button onClick={saveResp} disabled={pending} className="self-end rounded-[9px] bg-brand px-3 py-1.5 text-[11.5px] font-bold text-white">Zapisz odpowiedź</button>
        </div>
      )}
      {err && <span className="text-[10.5px] font-semibold text-bad">{err}</span>}
    </div>
  );
}
