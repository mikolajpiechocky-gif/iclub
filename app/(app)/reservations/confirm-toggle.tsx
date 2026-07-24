"use client";
// §II.6 Telefon do klienta: potwierdzenie szczegółów (pakiet, dodatki, sztuczna trawa,
// godzina montażu, miejsce, podłoże). Odhaczasz punkty w trakcie rozmowy i oznaczasz
// całość jako potwierdzoną (§42).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { markReservationConfirmedAction } from "./actions";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long" }) : "";

export interface ConfirmPoints {
  packageName: string | null;
  addons: string | null;
  assembly: string | null;
  location: string | null;
}

export function ClientConfirmToggle({ id, confirmed, confirmedAt, points }: { id: string; confirmed: boolean; confirmedAt: string | null; points: ConfirmPoints }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const items: { label: string; value: string | null }[] = [
    { label: "Pakiet", value: points.packageName },
    { label: "Dodatki", value: points.addons },
    { label: "Sztuczna trawa", value: null },
    { label: "Godzina montażu", value: points.assembly },
    { label: "Miejsce", value: points.location },
    { label: "Podłoże (trawa / kostka / …)", value: null },
  ];
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false));
  const doneCount = checked.filter(Boolean).length;

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const res = await markReservationConfirmedAction(id, !confirmed);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Błąd");
    });
  };

  if (confirmed) {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card-lg border border-[#1c4029] bg-[#12251a] p-4">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#16301f] text-ok"><Icon name="check" className="h-4.5 w-4.5" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-ink">Potwierdzone przez klienta</div>
          <div className="text-[12px] text-ink-2">Potwierdzono {fmtDate(confirmedAt)}</div>
        </div>
        {error && <span className="text-[11.5px] font-semibold text-bad">{error}</span>}
        <button onClick={toggle} disabled={pending} className="flex-none rounded-[11px] border border-border bg-surface-2 px-3.5 py-2 text-[12.5px] font-bold text-ink-2">{pending ? "…" : "Cofnij"}</button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-card-lg border border-[#3d3216] bg-[#241e10] p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#332814] text-warn"><Icon name="phone" className="h-4.5 w-4.5" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-ink">Telefon do klienta — potwierdź szczegóły</div>
          <div className="text-[12px] text-ink-2">Odhacz w trakcie rozmowy ({doneCount}/{items.length})</div>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-1.5">
        {items.map((it, i) => (
          <button key={it.label} onClick={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))} className="flex items-center gap-2.5 rounded-[10px] border border-border bg-surface px-2.5 py-2 text-left">
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border-2" style={{ background: checked[i] ? "#22c55e" : "transparent", borderColor: checked[i] ? "#22c55e" : "#3a3d4a" }}>
              {checked[i] && <Icon name="check" className="h-3 w-3 text-[#08170d]" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-[12.5px] font-semibold text-ink">{it.label}</span>
              {it.value && <span className="ml-1.5 text-[12px] text-ink-2">· {it.value}</span>}
            </span>
          </button>
        ))}
      </div>

      {error && <div className="mb-2 text-[11.5px] font-semibold text-bad">{error}</div>}
      <button onClick={toggle} disabled={pending} className="w-full rounded-[11px] bg-ok py-2.5 text-[12.5px] font-bold text-[#08170d]">{pending ? "…" : "Oznacz potwierdzone"}</button>
    </div>
  );
}
