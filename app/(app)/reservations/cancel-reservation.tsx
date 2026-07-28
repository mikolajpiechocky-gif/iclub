"use client";
// §rezerwacja Odwołanie rezerwacji przez klienta (tylko szef). iClub: zadatek przepada → przychód.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelReservationByClientAction } from "./actions";

export function CancelReservationButton({ id, isIclub, deposit, cancelled }: { id: string; isIclub: boolean; deposit: number; cancelled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (cancelled) {
    return <span className="rounded-field border border-border bg-surface-2 px-3.5 py-2 text-[12.5px] font-bold text-ink-2">Odwołana przez klienta</span>;
  }

  const run = () => {
    const forfeit = isIclub && deposit > 0 ? ` Zadatek ${deposit.toLocaleString("pl-PL")} zł przepada i wliczy się do przychodu.` : "";
    if (typeof window !== "undefined" && !window.confirm(`Odwołać rezerwację (odwołanie przez klienta)?${forfeit}`)) return;
    setError(null);
    start(async () => {
      const r = await cancelReservationByClientAction(id);
      if (r.ok) router.refresh();
      else setError(r.error ?? "Błąd");
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-[11.5px] font-semibold text-bad">{error}</span>}
      <button onClick={run} disabled={pending} className="rounded-field border border-[#3d3216] bg-[#241e10] px-3.5 py-2 text-[12.5px] font-bold text-warn disabled:opacity-60">
        {pending ? "Odwoływanie…" : "Odwołane przez klienta"}
      </button>
    </span>
  );
}
