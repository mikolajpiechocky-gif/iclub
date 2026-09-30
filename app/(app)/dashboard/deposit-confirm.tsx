"use client";
// Zadatek po podpisaniu umowy — szybka akcja w kokpicie: ✓ opłacony / ✗ nieopłacony (→ double-check → anuluj).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmDepositPaidAction, depositNotPaidCancelAction } from "../reservations/actions";

export function DepositConfirm({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const paid = () => start(async () => { await confirmDepositPaidAction(id); router.refresh(); });
  const cancel = () => start(async () => { await depositNotPaidCancelAction(id); router.refresh(); });

  if (confirming) {
    return (
      <div className="flex flex-none flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-bad">Anulować? Klient nie wpłacił zadatku</span>
        <button type="button" onClick={cancel} disabled={pending} className="rounded-[8px] bg-[#e11d48] px-2.5 py-1 text-[11.5px] font-bold text-white disabled:opacity-50">Tak, anuluj</button>
        <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="rounded-[8px] border border-border bg-surface-2 px-2.5 py-1 text-[11.5px] font-semibold text-ink-2">Wróć</button>
      </div>
    );
  }
  return (
    <div className="flex flex-none items-center gap-1.5">
      <button type="button" onClick={paid} disabled={pending} title="Zadatek wpłacony" className="flex h-8 w-9 items-center justify-center rounded-[9px] border border-[#1d3a28] bg-[#12271b] text-[15px] font-bold text-ok disabled:opacity-50">✓</button>
      <button type="button" onClick={() => setConfirming(true)} disabled={pending} title="Brak zadatku → anuluj" className="flex h-8 w-9 items-center justify-center rounded-[9px] border border-[#3a1c1f] bg-[#251215] text-[15px] font-bold text-bad disabled:opacity-50">✗</button>
    </div>
  );
}
