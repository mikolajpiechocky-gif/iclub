"use client";
// §rozliczenie Panel rozliczeń pracownika jako PROPOZYCJA: apka podsuwa rozbicie każdej realizacji
// (za realizację + daleki/gastro + opinia/rolka + paliwo). Tryb mieszany (czas wolny za N): baza jest
// KOSZTEM „w ramach umowy" (rozliczana poza apką), a DO WYPŁATY liczą się tylko dodatki. Tryb ryczałtowy:
// baza (ryczałt) jest do wypłaty. Kwota wypłacona zapisywana narastająco → „Pozostało do wypłaty".
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAssignmentExtrasAction, setEmployeePaidOutAction } from "./settlement-actions";
import type { EmployeeSettlementRow } from "@/lib/data/assignments";

const zl = (n: number) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export function EmployeeSettlements({ profileId, rows, reviewBonus, reelBonus, paidOut }: { profileId: string; rows: EmployeeSettlementRow[]; reviewBonus: number; reelBonus: number; paidOut: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [paidInput, setPaidInput] = useState(paidOut ? String(paidOut) : "");
  const [extras, setExtras] = useState<Record<string, { reviewGiven: boolean; reelGiven: boolean; reelLink: string; fuelAmount: string }>>(
    Object.fromEntries(rows.map((r) => [r.assignmentId, { reviewGiven: r.reviewGiven, reelGiven: r.reelGiven, reelLink: r.reelLink ?? "", fuelAmount: r.fuelAmount ? String(r.fuelAmount) : "" }])),
  );

  const extrasSum = (r: EmployeeSettlementRow) => {
    const e = extras[r.assignmentId];
    const guaranteed = r.guaranteed.reduce((s, b) => s + b.amount, 0);
    const review = e?.reviewGiven ? reviewBonus : 0;
    const reel = e?.reelGiven ? reelBonus : 0;
    const fuel = Number((e?.fuelAmount ?? "").replace(",", ".")) || 0;
    return guaranteed + review + reel + fuel;
  };
  const payoutOf = (r: EmployeeSettlementRow) => Math.round(((r.basePaidOut ? r.baseValue : 0) + extrasSum(r)) * 100) / 100;
  const umowaCostOf = (r: EmployeeSettlementRow) => (r.basePaidOut ? 0 : r.baseValue);

  const umowaTotal = Math.round(rows.reduce((s, r) => s + umowaCostOf(r), 0) * 100) / 100;
  const doWyplaty = Math.round(rows.reduce((s, r) => s + payoutOf(r), 0) * 100) / 100;
  const wyplacono = Number(paidInput.replace(",", ".")) || 0;
  const pozostalo = Math.round((doWyplaty - wyplacono) * 100) / 100;

  const saveExtras = (id: string, patch: Partial<{ reviewGiven: boolean; reelGiven: boolean; reelLink: string; fuelAmount: string }>) => {
    setExtras((x) => ({ ...x, [id]: { ...x[id], ...patch } }));
    const payload: { reviewGiven?: boolean; reelGiven?: boolean; reelLink?: string; fuelAmount?: number } = {};
    if (patch.reviewGiven !== undefined) payload.reviewGiven = patch.reviewGiven;
    if (patch.reelGiven !== undefined) payload.reelGiven = patch.reelGiven;
    if (patch.reelLink !== undefined) payload.reelLink = patch.reelLink;
    if (patch.fuelAmount !== undefined) payload.fuelAmount = Number((patch.fuelAmount || "").replace(",", ".")) || 0;
    void setAssignmentExtrasAction(id, profileId, payload);
  };

  const savePaid = () => start(async () => { await setEmployeePaidOutAction(profileId, wyplacono); router.refresh(); });

  return (
    <section className="mt-6 rounded-card-lg border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-[15px] font-bold text-white">Rozliczenia</h2>
        <span className="ml-auto text-[12px] font-semibold text-ink-2">{rows.length} zakończonych realizacji</span>
      </div>

      {/* Dwa główne kafelki */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-card border border-border bg-surface-2 px-4 py-3">
          <div className="text-[11px] font-semibold text-ink-2">W ramach umowy</div>
          <div className="mt-0.5 font-display text-[18px] font-bold text-ink">{zl(umowaTotal)}</div>
          <div className="text-[10.5px] text-ink-2">koszt realizacji · rozliczane poza apką</div>
        </div>
        <div className="rounded-card border border-[#1d3a28] bg-[#12271b] px-4 py-3">
          <div className="text-[11px] font-semibold text-ok/80">Do wypłaty</div>
          <div className="mt-0.5 font-display text-[18px] font-bold text-ok">{zl(doWyplaty)}</div>
          <div className="text-[10.5px] text-ok/60">dodatki + ryczałt (przez apkę)</div>
        </div>
      </div>

      {/* Wypłacono + pozostało */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface-2 px-4 py-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-ink-2">Wypłacono (narastająco)</label>
          <div className="flex items-center gap-1.5">
            <input inputMode="decimal" value={paidInput} onChange={(e) => setPaidInput(e.target.value)} placeholder="0" className="w-28 rounded-field border border-border bg-surface px-3 py-2 text-right text-[14px] font-semibold text-ink outline-none focus:border-accent" />
            <span className="text-[12px] font-semibold text-ink-2">zł</span>
            <button onClick={savePaid} disabled={pending} className="ml-1 rounded-field bg-brand px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60">{pending ? "…" : "Zapisz"}</button>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[11px] font-semibold text-ink-2">Pozostało do wypłaty</div>
          <div className={`font-display text-[20px] font-bold ${pozostalo > 0 ? "text-warn" : "text-ok"}`}>{zl(pozostalo)}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-[12.5px] text-ink-2">Brak zakończonych realizacji do rozliczenia.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const e = extras[r.assignmentId] ?? { reviewGiven: false, reelGiven: false, reelLink: "", fuelAmount: "" };
            return (
              <li key={r.assignmentId} className="rounded-card border border-border bg-surface-2 px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-ink">{r.title}</div>
                    <div className="text-[11.5px] text-ink-2">{fmtDate(r.eventDate)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[14px] font-bold text-ok">{zl(payoutOf(r))}</div>
                    <div className="text-[10.5px] text-ink-2">do wypłaty</div>
                  </div>
                </div>

                {/* Propozycja rozbicia */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className={`rounded-[8px] px-2 py-1 font-bold ${r.basePaidOut ? "bg-[#16301f] text-ok" : "bg-[#20242e] text-ink-2"}`}>
                    {r.baseLabel}: {zl(r.baseValue)} <span className="font-normal">{r.basePaidOut ? "· do wypłaty" : "· w ramach umowy"}</span>
                  </span>
                  {r.guaranteed.map((g, i) => (
                    <span key={i} className="rounded-[8px] bg-[#16301f] px-2 py-1 font-bold text-ok">{g.label} +{zl(g.amount)}</span>
                  ))}
                </div>

                {/* Do zaznaczenia */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => saveExtras(r.assignmentId, { reviewGiven: !e.reviewGiven })} className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-bold ${e.reviewGiven ? "border-ok bg-[#16301f] text-ok" : "border-border bg-surface text-ink-2"}`}>Opinia +{zl(reviewBonus)}</button>
                  <button type="button" onClick={() => saveExtras(r.assignmentId, { reelGiven: !e.reelGiven })} className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-bold ${e.reelGiven ? "border-ok bg-[#16301f] text-ok" : "border-border bg-surface text-ink-2"}`}>Rolka +{zl(reelBonus)}</button>
                  <div className="flex items-center gap-1 text-[11px] text-ink-2">
                    <span>Paliwo</span>
                    <input inputMode="decimal" value={e.fuelAmount} onChange={(ev) => setExtras((x) => ({ ...x, [r.assignmentId]: { ...x[r.assignmentId], fuelAmount: ev.target.value } }))} onBlur={() => saveExtras(r.assignmentId, { fuelAmount: e.fuelAmount })} placeholder="0" className="w-16 rounded-[8px] border border-border bg-surface px-2 py-1 text-right text-[12px] text-ink outline-none focus:border-accent" />
                    <span>zł</span>
                  </div>
                </div>
                {e.reelGiven && (
                  <input value={e.reelLink} onChange={(ev) => setExtras((x) => ({ ...x, [r.assignmentId]: { ...x[r.assignmentId], reelLink: ev.target.value } }))} onBlur={() => saveExtras(r.assignmentId, { reelLink: e.reelLink })} placeholder="Link do rolki (opcjonalnie)" className="mt-1.5 w-full rounded-[8px] border border-border bg-surface px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent" />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-ink-2">Propozycja: apka podsuwa kwoty; „w ramach umowy” (czas wolny) rozliczasz poza apką, „do wypłaty” to dodatki i ewentualny ryczałt. Wypłaty można przesuwać — wpisuj wypłaconą kwotę narastająco.</p>
    </section>
  );
}
