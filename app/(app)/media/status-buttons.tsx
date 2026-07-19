"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { IncidentStatus } from "@/lib/data/types";
import { setIncidentStatusAction } from "./actions";

export function IncidentStatusButtons({ id, status }: { id: string; status: IncidentStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const go = (next: IncidentStatus) => {
    setErr(null);
    startTransition(async () => {
      const res = await setIncidentStatusAction(id, next);
      if (res.ok) router.refresh();
      else setErr(res.error ?? "Błąd");
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {status === "OPEN" && <button onClick={() => go("IN_PROGRESS")} disabled={pending} className="rounded-[9px] border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2">Podejmij</button>}
        {status === "IN_PROGRESS" && <button onClick={() => go("RESOLVED")} disabled={pending} className="rounded-[9px] bg-[#22c55e] px-2.5 py-1.5 text-[11.5px] font-bold text-[#08170d]">Rozwiąż</button>}
        {status === "RESOLVED" && <button onClick={() => go("OPEN")} disabled={pending} className="rounded-[9px] border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2">Otwórz ponownie</button>}
      </div>
      {err && <span className="text-[10.5px] font-semibold text-bad">{err}</span>}
    </div>
  );
}
