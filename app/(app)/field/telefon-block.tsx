"use client";
// §II.12 Zadanie „Telefon do klienta" (przed pakowaniem). Skrypt + podsumowanie pakietu/
// dodatków, potwierdzenie 6 punktów, uzupełnienie godziny montażu i startu imprezy.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui";
import { saveClientCallAction } from "./actions";

const POINTS = ["Pakiet", "Dodatki", "Sztuczna trawa", "Godzina", "Miejsce", "Podłoże"];

export function TelefonBlock({ reservationId, jobId, packageName, addons, assemblyTime, eventStartTime, confirmed }: {
  reservationId: string;
  jobId: string;
  packageName: string | null;
  addons: string[];
  assemblyTime: string | null;
  eventStartTime: string | null;
  confirmed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(!confirmed);
  const [asm, setAsm] = useState(assemblyTime ?? "");
  const [start, setStart] = useState(eventStartTime ?? "");
  const [checks, setChecks] = useState<boolean[]>(POINTS.map(() => false));
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    setErr(null);
    startTransition(async () => {
      const res = await saveClientCallAction(reservationId, jobId, asm, start);
      if (res.ok) { setOpen(false); router.refresh(); }
      else setErr(res.error ?? "Błąd");
    });
  };

  return (
    <div className={`mb-3.5 rounded-[16px] border p-4 ${confirmed ? "border-border bg-surface" : "border-[#3d3216] bg-[#241e10]"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${confirmed ? "bg-[#16301f] text-ok" : "bg-[#332814] text-warn"}`}><Icon name={confirmed ? "check" : "phone"} className="h-4.5 w-4.5" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-ink">Telefon do klienta <span className="text-[11px] font-semibold text-ink-2">· przed pakowaniem</span></div>
          <div className="text-[11.5px] font-medium text-ink-2">{confirmed ? "Potwierdzone z klientem" : "Potwierdź szczegóły z klientem"}</div>
        </div>
        {confirmed && <button onClick={() => setOpen((o) => !o)} className="text-[11.5px] font-semibold text-ink-2">{open ? "Zwiń" : "Edytuj"}</button>}
      </div>

      {open && (
        <div className="mt-3">
          <p className="mb-3 rounded-[10px] bg-surface px-3 py-2.5 text-[12.5px] text-ink-2">Zadzwoń, aby potwierdzić pakiet i dodatki. Ustal godzinę, miejsce i podłoże, na jakim będziemy montowali namiot.</p>

          <div className="mb-3 flex flex-col gap-1 rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[12px]">
            <div className="flex justify-between gap-3"><span className="text-ink-2">Pakiet</span><span className="text-right font-semibold text-ink">{packageName ?? "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-ink-2">Dodatki</span><span className="text-right font-semibold text-ink">{addons.length ? addons.join(", ") : "—"}</span></div>
            {assemblyTime && <div className="flex justify-between gap-3"><span className="text-ink-2">Sugerowany montaż</span><span className="font-semibold text-ink">{assemblyTime}</span></div>}
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {POINTS.map((p, i) => (
              <button key={p} onClick={() => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))} className={`rounded-[8px] border px-2 py-1 text-[11.5px] font-semibold ${checks[i] ? "border-ok bg-[#16301f] text-ok" : "border-border bg-surface text-ink-2"}`}>{checks[i] ? "✓ " : ""}{p}</button>
            ))}
          </div>

          <div className="mb-2 flex gap-2">
            <label className="flex-1 text-[11px] text-ink-2">Godzina montażu
              <input type="time" value={asm} onChange={(e) => setAsm(e.target.value)} className="mt-0.5 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
            </label>
            <label className="flex-1 text-[11px] text-ink-2">Start imprezy
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-0.5 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
            </label>
          </div>
          <p className="mb-2 text-[11px] text-ink-2">Dosprzedaż dodatków w rozmowie → premia +15%.</p>
          {err && <div className="mb-2"><Alert tone="bad" title="Błąd">{err}</Alert></div>}
          <button onClick={save} disabled={pending} className="w-full rounded-[11px] bg-ok py-2.5 text-[12.5px] font-bold text-[#08170d]">{pending ? "Zapisywanie…" : "Potwierdzone — zapisz"}</button>
        </div>
      )}
    </div>
  );
}
