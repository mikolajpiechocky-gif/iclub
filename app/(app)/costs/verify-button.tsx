"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { verifyCostAction } from "./actions";

export function VerifyCostButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const click = () => {
    setErr(null);
    startTransition(async () => {
      const res = await verifyCostAction(id);
      if (res.ok) router.refresh();
      else setErr(res.error ?? "Błąd");
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={click} disabled={pending} className="bg-brand rounded-field px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50">{pending ? "…" : "Zatwierdź"}</button>
      {err && <span className="text-[10.5px] font-semibold text-bad">{err}</span>}
    </div>
  );
}
