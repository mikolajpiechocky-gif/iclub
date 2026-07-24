"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { verifyCostAction, rejectCostAction } from "./actions";

export function VerifyCostButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErr(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setErr(res.error ?? "Błąd");
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <button onClick={() => run(() => rejectCostAction(id))} disabled={pending} className="rounded-field border border-[#3a1c1f] bg-[#251215] px-3 py-2 text-[12px] font-semibold text-bad disabled:opacity-50">Odrzuć</button>
        <button onClick={() => run(() => verifyCostAction(id))} disabled={pending} className="bg-brand rounded-field px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50">{pending ? "…" : "Zatwierdź"}</button>
      </div>
      {err && <span className="text-[10.5px] font-semibold text-bad">{err}</span>}
    </div>
  );
}
