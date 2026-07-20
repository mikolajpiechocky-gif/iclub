"use client";
// Potwierdzenie klienta (§42): oznaczenie, że klient potwierdził szczegóły.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { markReservationConfirmedAction } from "./actions";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long" }) : "";

export function ClientConfirmToggle({ id, confirmed, confirmedAt }: { id: string; confirmed: boolean; confirmedAt: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const res = await markReservationConfirmedAction(id, !confirmed);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-3 rounded-card-lg border p-4 ${confirmed ? "border-[#1c4029] bg-[#12251a]" : "border-[#3d3216] bg-[#241e10]"}`}>
      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${confirmed ? "bg-[#16301f] text-ok" : "bg-[#332814] text-warn"}`}>
        <Icon name={confirmed ? "check" : "phone"} className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold text-ink">{confirmed ? "Potwierdzone przez klienta" : "Do potwierdzenia z klientem"}</div>
        <div className="text-[12px] text-ink-2">{confirmed ? `Potwierdzono ${fmtDate(confirmedAt)}` : "Skontaktuj się i potwierdź datę, adres, godziny i płatność."}</div>
      </div>
      {error && <span className="text-[11.5px] font-semibold text-bad">{error}</span>}
      <button
        onClick={toggle}
        disabled={pending}
        className={`flex-none rounded-[11px] px-3.5 py-2 text-[12.5px] font-bold ${confirmed ? "border border-border bg-surface-2 text-ink-2" : "bg-ok text-[#08170d]"}`}
      >
        {pending ? "…" : confirmed ? "Cofnij" : "Oznacz potwierdzone"}
      </button>
    </div>
  );
}
