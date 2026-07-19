"use client";
// Stepper etapów realizacji (mobile). Pracownik oznacza postęp etapów.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui";
import type { JobStageRecord, StageStatus } from "@/lib/data/types";
import { advanceStageAction } from "./actions";

export function FieldStages({ jobId, stages }: { jobId: string; stages: JobStageRecord[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const change = (stageId: string, status: StageStatus) => {
    setError(null);
    startTransition(async () => {
      const res = await advanceStageAction(stageId, jobId, status);
      if (res.ok) router.refresh();
      else if (res.error) setError(res.error);
    });
  };

  const done = stages.filter((s) => s.status === "DONE").length;

  return (
    <div className="rounded-[18px] border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-[#271b3f] text-[#b98cf5]"><Icon name="truck" className="h-4 w-4" /></span>
        <div className="flex-1"><div className="font-display text-[15px] font-bold text-white">Realizacja</div><div className="text-[11px] font-medium text-ink-2">{done}/{stages.length} etapów gotowych</div></div>
        <span className="font-display text-[13px] font-bold text-[#b98cf5]">{done}/{stages.length}</span>
      </div>

      {error && <div className="mb-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

      <div>
        {stages.map((s, i) => {
          const isDone = s.status === "DONE";
          const inProgress = s.status === "IN_PROGRESS";
          return (
            <div key={s.id} className="flex gap-3">
              <div className="flex flex-none flex-col items-center">
                <span className="flex h-7.5 w-7.5 items-center justify-center rounded-full border-2 text-[13px] font-bold" style={{ height: 30, width: 30, background: isDone ? "#22c55e" : "#191b24", borderColor: isDone ? "#22c55e" : inProgress ? "#e11d74" : "#2a2d3a", color: isDone ? "#08170d" : inProgress ? "#f26fa6" : "#6b7180" }}>
                  {isDone ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {i < stages.length - 1 && <span className="my-0.5 w-0.5 flex-1" style={{ minHeight: 18, background: isDone ? "#22c55e" : "#262935" }} />}
              </div>
              <div className="flex-1 pb-3">
                <div className="text-[14px] font-bold" style={{ color: isDone ? "#7c818f" : inProgress ? "#ecedf2" : "#9096a8" }}>{s.title}</div>
                <div className="mt-1.5 flex gap-2">
                  {s.status === "TODO" && (
                    <button onClick={() => change(s.id, "IN_PROGRESS")} disabled={pending} className="rounded-[10px] bg-[#271b3f] px-3 py-1.5 text-[12px] font-bold text-[#e0c8ff]">Rozpocznij</button>
                  )}
                  {s.status === "IN_PROGRESS" && (
                    <button onClick={() => change(s.id, "DONE")} disabled={pending} className="rounded-[10px] bg-[#22c55e] px-3 py-1.5 text-[12px] font-bold text-[#08170d]">Zakończ etap ✓</button>
                  )}
                  {s.status === "DONE" && (
                    <button onClick={() => change(s.id, "TODO")} disabled={pending} className="rounded-[10px] border border-border bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-ink-2">Cofnij</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
