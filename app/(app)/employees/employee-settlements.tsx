"use client";
// §rozliczenie Rozliczenia PER ZLECENIE: przy każdej realizacji przycisk „Rozlicz" + kwota (domyślnie
// wyliczona). Lista zwijana miesiącami. Bez narastającej kwoty — każde zlecenie odhaczasz osobno,
// a kafelek „Rozliczenia pracowników" na pulpicie schodzi, gdy nie ma już nierozliczonych.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAssignmentExtrasAction, settleAssignmentAction } from "./settlement-actions";
import type { EmployeeSettlementRow } from "@/lib/data/assignments";

const zl = (n: number) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const monthKey = (iso: string | null) => (iso ? iso.slice(0, 7) : "0000-00");
const monthLabel = (key: string) => {
  if (key === "0000-00") return "Bez daty";
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("pl-PL", { month: "long", year: "numeric", timeZone: "UTC" });
};

export function EmployeeSettlements({ profileId, rows, reviewBonus, reelBonus }: { profileId: string; rows: EmployeeSettlementRow[]; reviewBonus: number; reelBonus: number; paidOut?: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [extras, setExtras] = useState<Record<string, { reviewGiven: boolean; reelGiven: boolean; reelLink: string; fuelAmount: string }>>(
    Object.fromEntries(rows.map((r) => [r.assignmentId, { reviewGiven: r.reviewGiven, reelGiven: r.reelGiven, reelLink: r.reelLink ?? "", fuelAmount: r.fuelAmount ? String(r.fuelAmount) : "" }])),
  );
  const [amountEdit, setAmountEdit] = useState<Record<string, string>>({});

  const extrasSum = (r: EmployeeSettlementRow) => {
    const e = extras[r.assignmentId];
    const guaranteed = r.guaranteed.reduce((s, b) => s + b.amount, 0);
    const review = e?.reviewGiven ? reviewBonus : 0;
    const reel = e?.reelGiven ? reelBonus : 0;
    const fuel = Number((e?.fuelAmount ?? "").replace(",", ".")) || 0;
    return guaranteed + review + reel + fuel;
  };
  const payoutOf = (r: EmployeeSettlementRow) => Math.round(((r.basePaidOut ? r.baseValue : 0) + extrasSum(r)) * 100) / 100;

  // Sumy: nierozliczone (do wypłaty) vs rozliczone.
  const doWyplaty = Math.round(rows.filter((r) => !r.settledAt).reduce((s, r) => s + payoutOf(r), 0) * 100) / 100;
  const rozliczono = Math.round(rows.filter((r) => r.settledAt).reduce((s, r) => s + (r.settledAmount ?? payoutOf(r)), 0) * 100) / 100;
  const umowaTotal = Math.round(rows.reduce((s, r) => s + (r.basePaidOut ? 0 : r.baseValue), 0) * 100) / 100;

  const saveExtras = (id: string, patch: Partial<{ reviewGiven: boolean; reelGiven: boolean; reelLink: string; fuelAmount: string }>) => {
    setExtras((x) => ({ ...x, [id]: { ...x[id], ...patch } }));
    const payload: { reviewGiven?: boolean; reelGiven?: boolean; reelLink?: string; fuelAmount?: number } = {};
    if (patch.reviewGiven !== undefined) payload.reviewGiven = patch.reviewGiven;
    if (patch.reelGiven !== undefined) payload.reelGiven = patch.reelGiven;
    if (patch.reelLink !== undefined) payload.reelLink = patch.reelLink;
    if (patch.fuelAmount !== undefined) payload.fuelAmount = Number((patch.fuelAmount || "").replace(",", ".")) || 0;
    void setAssignmentExtrasAction(id, profileId, payload);
  };

  const settle = (r: EmployeeSettlementRow) => {
    const raw = amountEdit[r.assignmentId];
    const amount = raw != null && raw.trim() ? (Number(raw.replace(",", ".")) || 0) : payoutOf(r);
    start(async () => { await settleAssignmentAction(r.assignmentId, profileId, true, amount); router.refresh(); });
  };
  const unsettle = (r: EmployeeSettlementRow) => start(async () => { await settleAssignmentAction(r.assignmentId, profileId, false); router.refresh(); });

  // Grupowanie po miesiącu (malejąco). Najnowszy miesiąc otwarty domyślnie.
  const groups = new Map<string, EmployeeSettlementRow[]>();
  for (const r of rows) { const k = monthKey(r.eventDate); (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }
  const monthKeys = [...groups.keys()].sort((a, b) => (a < b ? 1 : -1));

  return (
    <section className="mt-6 rounded-card-lg border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-[15px] font-bold text-white">Rozliczenia</h2>
        <span className="ml-auto text-[12px] font-semibold text-ink-2">{rows.length} zakończonych realizacji</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3">
          <div className="text-[11px] font-semibold text-warn/80">Do wypłaty (nierozliczone)</div>
          <div className="mt-0.5 font-display text-[18px] font-bold text-warn">{zl(doWyplaty)}</div>
        </div>
        <div className="rounded-card border border-[#1d3a28] bg-[#12271b] px-4 py-3">
          <div className="text-[11px] font-semibold text-ok/80">Rozliczono</div>
          <div className="mt-0.5 font-display text-[18px] font-bold text-ok">{zl(rozliczono)}</div>
        </div>
        <div className="col-span-2 rounded-card border border-border bg-surface-2 px-4 py-3 sm:col-span-1">
          <div className="text-[11px] font-semibold text-ink-2">W ramach umowy</div>
          <div className="mt-0.5 font-display text-[18px] font-bold text-ink">{zl(umowaTotal)}</div>
          <div className="text-[10.5px] text-ink-2">czas wolny · rozliczane poza apką</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-[12.5px] text-ink-2">Brak zakończonych realizacji do rozliczenia.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {monthKeys.map((mk, idx) => {
            const mrows = groups.get(mk)!;
            const monthDue = mrows.filter((r) => !r.settledAt).reduce((s, r) => s + payoutOf(r), 0);
            const unsettledN = mrows.filter((r) => !r.settledAt).length;
            return (
              <details key={mk} open={idx === 0} className="overflow-hidden rounded-card border border-border bg-surface-2">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5">
                  <span className="text-[13.5px] font-bold capitalize text-white">{monthLabel(mk)}</span>
                  <span className="text-[11.5px] font-semibold text-ink-2">{mrows.length} real.</span>
                  <span className="ml-auto text-[12.5px] font-bold" style={{ color: unsettledN > 0 ? "#ebb05a" : "#5fd68b" }}>
                    {unsettledN > 0 ? `${zl(Math.round(monthDue * 100) / 100)} do wypłaty` : "rozliczone ✓"}
                  </span>
                </summary>
                <ul className="flex flex-col gap-2 border-t border-border-soft px-3 py-3">
                  {mrows.map((r) => {
                    const e = extras[r.assignmentId] ?? { reviewGiven: false, reelGiven: false, reelLink: "", fuelAmount: "" };
                    const payout = payoutOf(r);
                    const settled = Boolean(r.settledAt);
                    return (
                      <li key={r.assignmentId} className={`rounded-card border px-3 py-3 ${settled ? "border-[#1d3a28] bg-[#0f1c14]" : "border-border bg-surface"}`}>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold text-ink">{r.title}</div>
                            <div className="text-[11.5px] text-ink-2">{fmtDate(r.eventDate)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-[14px] font-bold text-ok">{zl(settled ? (r.settledAmount ?? payout) : payout)}</div>
                            <div className="text-[10.5px] text-ink-2">{settled ? "rozliczono" : "do wypłaty"}</div>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className={`rounded-[8px] px-2 py-1 font-bold ${r.basePaidOut ? "bg-[#16301f] text-ok" : "bg-[#20242e] text-ink-2"}`}>
                            {r.baseLabel}: {zl(r.baseValue)} <span className="font-normal">{r.basePaidOut ? "· do wypłaty" : "· w ramach umowy"}</span>
                          </span>
                          {r.guaranteed.map((g, i) => (
                            <span key={i} className="rounded-[8px] bg-[#16301f] px-2 py-1 font-bold text-ok">{g.label} +{zl(g.amount)}</span>
                          ))}
                        </div>

                        {!settled && (
                          <>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <button type="button" onClick={() => saveExtras(r.assignmentId, { reviewGiven: !e.reviewGiven })} className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-bold ${e.reviewGiven ? "border-ok bg-[#16301f] text-ok" : "border-border bg-surface-2 text-ink-2"}`}>Opinia +{zl(reviewBonus)}</button>
                              <button type="button" onClick={() => saveExtras(r.assignmentId, { reelGiven: !e.reelGiven })} className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-bold ${e.reelGiven ? "border-ok bg-[#16301f] text-ok" : "border-border bg-surface-2 text-ink-2"}`}>Rolka +{zl(reelBonus)}</button>
                              <div className="flex items-center gap-1 text-[11px] text-ink-2">
                                <span>Paliwo</span>
                                <input inputMode="decimal" value={e.fuelAmount} onChange={(ev) => setExtras((x) => ({ ...x, [r.assignmentId]: { ...x[r.assignmentId], fuelAmount: ev.target.value } }))} onBlur={() => saveExtras(r.assignmentId, { fuelAmount: e.fuelAmount })} placeholder="0" className="w-16 rounded-[8px] border border-border bg-surface-2 px-2 py-1 text-right text-[12px] text-ink outline-none focus:border-accent" />
                                <span>zł</span>
                              </div>
                              {r.transportCost > 0 && (
                                <button type="button" onClick={() => saveExtras(r.assignmentId, { fuelAmount: String(r.transportCost) })} title="Zwrot za własne auto: paliwo + eksploatacja (5 gr/km) z trasy" className="rounded-[8px] border border-border bg-surface-2 px-2 py-1 text-[10.5px] font-bold text-ink-2 hover:text-ink">
                                  Własnym autem: {zl(r.transportCost)}
                                </button>
                              )}
                            </div>
                            {e.reelGiven && (
                              <input value={e.reelLink} onChange={(ev) => setExtras((x) => ({ ...x, [r.assignmentId]: { ...x[r.assignmentId], reelLink: ev.target.value } }))} onBlur={() => saveExtras(r.assignmentId, { reelLink: e.reelLink })} placeholder="Link do rolki (opcjonalnie)" className="mt-1.5 w-full rounded-[8px] border border-border bg-surface-2 px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent" />
                            )}
                            {/* Rozlicz to zlecenie: kwota (domyślnie wyliczona) + przycisk */}
                            <div className="mt-2.5 flex items-center gap-2 border-t border-border-soft pt-2.5">
                              <span className="text-[11.5px] font-semibold text-ink-2">Rozlicz kwotę</span>
                              <input inputMode="decimal" value={amountEdit[r.assignmentId] ?? String(payout)} onChange={(ev) => setAmountEdit((x) => ({ ...x, [r.assignmentId]: ev.target.value }))} className="w-24 rounded-field border border-border bg-surface-2 px-2.5 py-1.5 text-right text-[13px] font-semibold text-ink outline-none focus:border-accent" />
                              <span className="text-[12px] font-semibold text-ink-2">zł</span>
                              <button onClick={() => settle(r)} disabled={pending} className="ml-auto rounded-field bg-[#22c55e] px-3.5 py-1.5 text-[12.5px] font-bold text-[#08170d] disabled:opacity-60">Rozlicz ✓</button>
                            </div>
                          </>
                        )}
                        {settled && (
                          <div className="mt-2 flex items-center gap-2 border-t border-border-soft pt-2 text-[11.5px]">
                            <span className="font-semibold text-ok">Rozliczono ✓ {zl(r.settledAmount ?? payout)} · {fmtDate(r.settledAt)}</span>
                            <button onClick={() => unsettle(r)} disabled={pending} className="ml-auto rounded-[9px] border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-ink-2">Cofnij</button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[11px] text-ink-2">Każde zlecenie rozliczasz osobno przyciskiem „Rozlicz” (kwota domyślnie wyliczona, można zmienić). „W ramach umowy” (czas wolny) rozliczasz poza apką. Lista zwinięta miesiącami.</p>
    </section>
  );
}
