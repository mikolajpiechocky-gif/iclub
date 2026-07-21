"use client";
// Usuwanie rezerwacji z dwustopniowym potwierdzeniem (operacja nieodwracalna). Tylko Szef.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteReservationAction } from "./actions";

export function DeleteReservationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const del = () => {
    setError(null);
    start(async () => {
      const res = await deleteReservationAction(id);
      if (res.ok) { router.push("/reservations"); router.refresh(); return; }
      setError(res.error ?? "Nie udało się usunąć.");
      setConfirming(false);
    });
  };

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="rounded-[13px] border border-[#3a1c1f] bg-[#251215] px-4 py-2.5 text-[13px] font-bold text-bad">
        Usuń rezerwację
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[13px] border border-[#3a1c1f] bg-[#251215] p-3.5">
      <div className="text-[12.5px] font-semibold text-bad">
        Na pewno usunąć tę rezerwację? Usunie też powiązaną realizację, jej etapy i płatności. Tej operacji nie można cofnąć.
      </div>
      {error && <div className="text-[12px] font-semibold text-bad">{error}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={del} disabled={pending} className="rounded-[10px] bg-bad px-3.5 py-2 text-[12.5px] font-bold text-white">
          {pending ? "Usuwanie…" : "Tak, usuń na stałe"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="rounded-[10px] border border-border bg-surface px-3.5 py-2 text-[12.5px] font-semibold text-ink-2">
          Anuluj
        </button>
      </div>
    </div>
  );
}
