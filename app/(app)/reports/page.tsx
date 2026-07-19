// app/(app)/reports/page.tsx — Raporty i rentowność (RSC, tylko OWNER).
// Przychód (płatności zapłacone) − koszty = zysk; per zlecenie i per linia (§16, §45).
import { PageHeader } from "@/components/layout";
import { MetricCard, Alert, Pill } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listJobs } from "@/lib/data/jobs";
import { listPayments } from "@/lib/data/payments";
import { listCosts } from "@/lib/data/costs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { JOB_STATUS_META } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const fmtPLN = (v: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

export default async function ReportsPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Raporty" subtitle="Dostępne dla właściciela" />
        <Alert tone="info" title="Brak dostępu">Rentowność i pełne finanse widzi tylko właściciel.</Alert>
      </div>
    );
  }

  const [jobs, payments, costs] = await Promise.all([listJobs(), listPayments(), listCosts()]);
  const demo = !isSupabaseConfigured();

  const paidByJob = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "PAID" || !p.job_id) continue;
    paidByJob.set(p.job_id, (paidByJob.get(p.job_id) ?? 0) + Number(p.amount || 0));
  }
  const costByJob = new Map<string, number>();
  for (const c of costs) {
    if (!c.job_id) continue;
    costByJob.set(c.job_id, (costByJob.get(c.job_id) ?? 0) + Number(c.amount || 0));
  }

  const rows = jobs.map((j) => {
    const rev = paidByJob.get(j.id) ?? 0;
    const cost = costByJob.get(j.id) ?? 0;
    return { job: j, rev, cost, profit: rev - cost };
  });

  const totalRev = rows.reduce((s, r) => s + r.rev, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalProfit = totalRev - totalCost;

  const byLine = (line: "ICLUB" | "EQUIPMENT_RENTAL") => {
    const rs = rows.filter((r) => r.job.business_line === line);
    const rev = rs.reduce((s, r) => s + r.rev, 0);
    const cost = rs.reduce((s, r) => s + r.cost, 0);
    return { rev, cost, profit: rev - cost, count: rs.length };
  };
  const iclub = byLine("ICLUB");
  const rental = byLine("EQUIPMENT_RENTAL");

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6 md:px-8">
      <PageHeader title="Raporty i rentowność" subtitle="Przychód (zapłacone) − koszty = zysk" />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Uwzględnia płatności o statusie „Zapłacone” i wszystkie koszty.
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <MetricCard label="Przychód" value={fmtPLN(totalRev)} tone="ok" />
        <MetricCard label="Koszty" value={fmtPLN(totalCost)} tone="warn" />
        <MetricCard label="Zysk" value={fmtPLN(totalProfit)} sub={`marża ${pct(totalProfit, totalRev)}`} tone={totalProfit >= 0 ? "ok" : "bad"} />
        <MetricCard label="Zlecenia" value={String(jobs.length)} />
      </div>

      {/* Per linia biznesowa */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { name: "iClub (namioty)", d: iclub, c: "#e11d74" },
          { name: "Wypożyczalnia", d: rental, c: "#14b8c4" },
        ].map((l) => (
          <div key={l.name} className="rounded-card-lg border border-border bg-surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.c }} />
              <h2 className="font-display text-[15px] font-bold text-white">{l.name}</h2>
              <span className="ml-auto text-[12px] font-semibold text-ink-2">{l.d.count} zleceń</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><div className="text-[11px] font-semibold text-ink-2">Przychód</div><div className="mt-0.5 font-display text-[16px] font-bold text-ok">{fmtPLN(l.d.rev)}</div></div>
              <div><div className="text-[11px] font-semibold text-ink-2">Koszty</div><div className="mt-0.5 font-display text-[16px] font-bold text-warn">{fmtPLN(l.d.cost)}</div></div>
              <div><div className="text-[11px] font-semibold text-ink-2">Zysk</div><div className="mt-0.5 font-display text-[16px] font-bold" style={{ color: l.d.profit >= 0 ? "#5fd68b" : "#f58585" }}>{fmtPLN(l.d.profit)}</div></div>
            </div>
          </div>
        ))}
      </div>

      {/* Per zlecenie */}
      <h2 className="mb-3 font-display text-[15px] font-bold text-white">Rentowność zleceń</h2>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-[#12131a] text-[11px] font-bold uppercase tracking-[0.5px] text-muted">
            <tr>{["Zlecenie", "Status", "Przychód", "Koszty", "Zysk", "Marża"].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const m = JOB_STATUS_META[r.job.status];
              return (
                <tr key={r.job.id} className="border-b border-border-soft last:border-0">
                  <td className="px-4 py-3 text-[13px] font-bold text-ink">{r.job.reservation?.customer?.name ?? r.job.title ?? "Zlecenie"}</td>
                  <td className="px-4 py-3"><Pill label={m.label} fg={m.fg} bg={m.bg} /></td>
                  <td className="px-4 py-3 text-[13px] text-ok">{fmtPLN(r.rev)}</td>
                  <td className="px-4 py-3 text-[13px] text-warn">{fmtPLN(r.cost)}</td>
                  <td className="px-4 py-3 text-[13px] font-bold" style={{ color: r.profit >= 0 ? "#5fd68b" : "#f58585" }}>{fmtPLN(r.profit)}</td>
                  <td className="px-4 py-3 text-[13px] text-ink-2">{pct(r.profit, r.rev)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
