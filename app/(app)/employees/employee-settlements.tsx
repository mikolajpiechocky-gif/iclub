"use client";
// §24 Rozliczenia pracownika: zakończone realizacje z wynagrodzeniem, premie rozliczane per
// realizacja (opinia, rolka + link, zwrot paliwa), saldo „do wypłaty" i oznaczanie „rozliczone".
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { settleAssignmentAction, settleAllForEmployeeAction, setAssignmentExtrasAction } from "./settlement-actions";
import type { EmployeeSettlementRow } from "@/lib/data/assignments";

const zl = (n: number) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export function EmployeeSettlements({ profileId, rows, reviewBonus, reelBonus }: { profileId: string; rows: EmployeeSettlementRow[]; reviewBonus: number; reelBonus: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Lokalny stan edycji dodatków per realizacja (optymistycznie, potem zapis + refresh).
  const [extras, setExtras] = useState<Record<string, { reviewGiven: boolean; reelGiven: boolean; reelLink: string; fuelAmount: string }>>(
    Object.fromEntries(rows.map((r) => [r.assignmentId, { reviewGiven: r.reviewGiven, reelGiven: r.reelGiven, reelLink: r.reelLink ?? "", fuelAmount: r.fuelAmount ? String(r.fuelAmount) : "" }])),
  );

  const rowTotal = (r: EmployeeSettlementRow) => {
    const e = extras[r.assignmentId];
    const review = e?.reviewGiven ? reviewBonus : 0;
    const reel = e?.reelGiven ? reelBonus : 0;
    const fuel = Number((e?.fuelAmount ?? "").replace(",", ".")) || 0;
    return Math.round((r.amount + review + reel + fuel) * 100) / 100;
  };

  const unpaid = rows.filter((r) => !r.settledAt);
  const saldo = unpaid.reduce((s, r) => s + rowTotal(r), 0);
  const paid = rows.filter((r) => r.settledAt).reduce((s, r) => s + rowTotal(r), 0);

  // Zapisujemy TYLKO zmienione pole (akcja robi patch), bez router.refresh — inaczej odświeżenie
  // i onBlur innych inputów nadpisywały odznaczenie (np. rolki „nie dało się odkliknąć").
  const saveExtras = (id: string, patch: Partial<{ reviewGiven: boolean; reelGiven: boolean; reelLink: string; fuelAmount: string }>) => {
    setExtras((x) => ({ ...x, [id]: { ...x[id], ...patch } }));
    const payload: { reviewGiven?: boolean; reelGiven?: boolean; reelLink?: string; fuelAmount?: number } = {};
    if (patch.reviewGiven !== undefined) payload.reviewGiven = patch.reviewGiven;
    if (patch.reelGiven !== undefined) payload.reelGiven = patch.reelGiven;
    if (patch.reelLink !== undefined) payload.reelLink = patch.reelLink;
    if (patch.fuelAmount !== undefined) payload.fuelAmount = Number((patch.fuelAmount || "").replace(",", ".")) || 0;
    void setAssignmentExtrasAction(id, profileId, payload);
  };

  const settle = (id: string, settled: boolean) => start(async () => { await settleAssignmentAction(id, settled, profileId); router.refresh(); });
  const settleAll = () => start(async () => { await settleAllForEmployeeAction(profileId); router.refresh(); });

  return (
    <section className="mt-6 rounded-card-lg border border-border bg-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-display text-[15px] font-bold text-white">Rozliczenia</h2>
        <span className="ml-auto text-[12px] font-semibold text-ink-2">{rows.length} zakończonych realizacji</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-card border border-border bg-surface-2 px-4 py-3">
          <div className="text-[11px] font-semibold text-ink-2">Do wypłaty</div>
          <div className="mt-0.5 font-display text-[18px] font-bold text-warn">{zl(saldo)}</div>
        </div>
        <div className="rounded-card border border-border bg-surface-2 px-4 py-3">
          <div className="text-[11px] font-semibold text-ink-2">Wypłacone łącznie</div>
          <div className="mt-0.5 font-display text-[18px] font-bold text-ok">{zl(paid)}</div>
        </div>
      </div>

      {unpaid.length > 0 && (
        <button onClick={settleAll} disabled={pending} className="mb-3 w-full rounded-field bg-ok py-2.5 text-[12.5px] font-bold text-[#08170d] disabled:opacity-60">
          {pending ? "Zapisywanie…" : `Oznacz wszystko jako rozliczone (${zl(saldo)})`}
        </button>
      )}

      {rows.length === 0 ? (
        <p className="text-[12.5px] text-ink-2">Brak zakończonych realizacji do rozliczenia.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const e = extras[r.assignmentId] ?? { reviewGiven: false, reelGiven: false, reelLink: "", fuelAmount: "" };
            const settled = Boolean(r.settledAt);
            return (
              <li key={r.assignmentId} className={`rounded-card border px-3 py-3 ${settled ? "border-[#1d3a28] bg-[#12271b]" : "border-border bg-surface-2"}`}>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-ink">{r.title}</div>
                    <div className="text-[11.5px] text-ink-2">{fmtDate(r.eventDate)} · baza {zl(r.amount)}{settled ? ` · rozliczono ${fmtDate(r.settledAt)}` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[14px] font-bold text-ink">{zl(rowTotal(r))}</div>
                    <button onClick={() => settle(r.assignmentId, !settled)} disabled={pending} className={`text-[11.5px] font-bold ${settled ? "text-ink-2" : "text-ok"}`}>
                      {settled ? "Cofnij" : "Rozlicz ✓"}
                    </button>
                  </div>
                </div>

                {/* Premie i zwroty rozliczane per realizacja */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => saveExtras(r.assignmentId, { reviewGiven: !e.reviewGiven })} disabled={settled} className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-bold disabled:opacity-60 ${e.reviewGiven ? "border-ok bg-[#16301f] text-ok" : "border-border bg-surface text-ink-2"}`}>
                    Opinia +{zl(reviewBonus)}
                  </button>
                  <button type="button" onClick={() => saveExtras(r.assignmentId, { reelGiven: !e.reelGiven })} disabled={settled} className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-bold disabled:opacity-60 ${e.reelGiven ? "border-ok bg-[#16301f] text-ok" : "border-border bg-surface text-ink-2"}`}>
                    Rolka +{zl(reelBonus)}
                  </button>
                  <div className="flex items-center gap-1 text-[11px] text-ink-2">
                    <span>Paliwo</span>
                    <input inputMode="decimal" value={e.fuelAmount} onChange={(ev) => setExtras((x) => ({ ...x, [r.assignmentId]: { ...x[r.assignmentId], fuelAmount: ev.target.value } }))} onBlur={() => saveExtras(r.assignmentId, { fuelAmount: e.fuelAmount })} disabled={settled} placeholder="0" className="w-16 rounded-[8px] border border-border bg-surface px-2 py-1 text-right text-[12px] text-ink outline-none focus:border-accent disabled:opacity-60" />
                    <span>zł</span>
                  </div>
                </div>
                {e.reelGiven && (
                  <input value={e.reelLink} onChange={(ev) => setExtras((x) => ({ ...x, [r.assignmentId]: { ...x[r.assignmentId], reelLink: ev.target.value } }))} onBlur={() => saveExtras(r.assignmentId, { reelLink: e.reelLink })} disabled={settled} placeholder="Link do rolki (opcjonalnie)" className="mt-1.5 w-full rounded-[8px] border border-border bg-surface px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-accent disabled:opacity-60" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
