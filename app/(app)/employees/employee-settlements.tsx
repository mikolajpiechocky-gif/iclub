"use client";
// §24 Rozliczenia pracownika: historia zakończonych realizacji z wynagrodzeniem, saldo
// „do wypłaty" i oznaczanie „rozliczone" (tylko szef).
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { settleAssignmentAction, settleAllForEmployeeAction } from "./settlement-actions";
import type { EmployeeSettlementRow } from "@/lib/data/assignments";

const zl = (n: number) => new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" }) : "—");

export function EmployeeSettlements({ profileId, rows }: { profileId: string; rows: EmployeeSettlementRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unpaid = rows.filter((r) => !r.settledAt);
  const saldo = unpaid.reduce((s, r) => s + r.amount, 0);
  const paid = rows.filter((r) => r.settledAt).reduce((s, r) => s + r.amount, 0);

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
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li key={r.assignmentId} className={`flex items-center gap-2 rounded-card border px-3 py-2.5 ${r.settledAt ? "border-[#1d3a28] bg-[#12271b]" : "border-border bg-surface-2"}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-ink">{r.title}</div>
                <div className="text-[11.5px] text-ink-2">{fmtDate(r.eventDate)}{r.settledAt ? ` · rozliczono ${fmtDate(r.settledAt)}` : ""}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-[14px] font-bold text-ink">{zl(r.amount)}</div>
                <button onClick={() => settle(r.assignmentId, !r.settledAt)} disabled={pending} className={`text-[11.5px] font-bold ${r.settledAt ? "text-ink-2" : "text-ok"}`}>
                  {r.settledAt ? "Cofnij" : "Rozlicz ✓"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
