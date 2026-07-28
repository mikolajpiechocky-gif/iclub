"use client";
// Jednorazowy przycisk: doliczenie kosztów (wynagrodzenia + paliwo) do zakończonych realizacji
// zamkniętych przed wprowadzeniem automatycznego zapisu kosztów. Idempotentny.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { backfillRealizationCostsAction } from "./backfill-actions";

export function BackfillCostsButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = () => {
    if (!window.confirm("Doliczyć koszty (wynagrodzenia + paliwo) do wszystkich zakończonych realizacji? Operacja jest bezpieczna — nie zdubluje kosztów już zapisanych.")) return;
    start(async () => {
      const r = await backfillRealizationCostsAction();
      if (r.ok) { setMsg({ ok: true, text: `Gotowe — przetworzono ${r.processed} zakończonych realizacji.` }); router.refresh(); }
      else setMsg({ ok: false, text: r.error ?? "Nie udało się." });
    });
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button onClick={run} disabled={pending} className="rounded-field border border-border bg-surface-2 px-3 py-1.5 text-[11.5px] font-semibold text-ink-2 hover:text-ink disabled:opacity-60">
        {pending ? "Doliczanie…" : "Dolicz koszty starych realizacji"}
      </button>
      {msg && <span className={`text-[11.5px] font-semibold ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</span>}
    </div>
  );
}
