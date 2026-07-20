// app/(app)/reports/page.tsx — Raporty i rentowność (RSC, tylko OWNER).
// Przychód (płatności zapłacone) − koszty = zysk; per zlecenie i per linia (§16, §45).
// Filtr roku: „Wszystko" (total) oraz per rok wg daty realizacji.
import { PageHeader } from "@/components/layout";
import { MetricCard, Alert, Pill } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listJobs } from "@/lib/data/jobs";
import { listPayments } from "@/lib/data/payments";
import { listCosts } from "@/lib/data/costs";
import { listInvestments } from "@/lib/data/investments";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { JOB_STATUS_META, type JobWithReservation } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const fmtPLN = (v: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

const CAT_COLOR: Record<string, string> = { Pojazd: "#e11d74", Sprzęt: "#14b8c4", Marketing: "#f59e0b" };

// Rok realizacji zlecenia: z daty zlecenia, w razie braku z rezerwacji.
const jobYear = (j: JobWithReservation): string =>
  (j.event_date ?? j.reservation?.event_date ?? "").slice(0, 4);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Raporty" subtitle="Dostępne dla właściciela" />
        <Alert tone="info" title="Brak dostępu">Rentowność i pełne finanse widzi tylko właściciel.</Alert>
      </div>
    );
  }

  const [jobs, payments, costs, investments] = await Promise.all([listJobs(), listPayments(), listCosts(), listInvestments()]);
  const demo = !isSupabaseConfigured();

  // Dostępne lata (malejąco) + wybór z URL; domyślnie „Wszystko".
  const years = Array.from(new Set(jobs.map(jobYear).filter(Boolean))).sort().reverse();
  const { year: yearParam } = await searchParams;
  const selectedYear = yearParam && years.includes(yearParam) ? yearParam : "all";

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

  const rows = jobs
    .filter((j) => selectedYear === "all" || jobYear(j) === selectedYear)
    .map((j) => {
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

  // Inwestycje (majątek) — narastająco, niezależnie od filtra roku. NIE są kosztem
  // realizacji; zwrot liczony z zysku narastająco (przychód − koszty bieżące).
  const invested = investments.reduce((s, i) => s + Number(i.amount || 0), 0);
  const allRevenue = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount || 0), 0);
  const allOpCost = costs.reduce((s, c) => s + Number(c.amount || 0), 0);
  const cumProfit = allRevenue - allOpCost;
  const returned = Math.max(0, cumProfit);
  const paybackPct = invested > 0 ? Math.min(100, Math.round((returned / invested) * 100)) : 0;
  const remaining = Math.max(0, invested - returned);
  const invByCat = new Map<string, number>();
  for (const i of investments) invByCat.set(i.category, (invByCat.get(i.category) ?? 0) + Number(i.amount || 0));
  const invCats = [...invByCat.entries()].sort((a, b) => b[1] - a[1]);

  const scopeLabel = selectedYear === "all" ? "od początku" : `rok ${selectedYear}`;
  const tabs = [{ k: "all", label: "Wszystko" }, ...years.map((y) => ({ k: y, label: y }))];

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6 md:px-8">
      <PageHeader title="Raporty i rentowność" subtitle={`Przychód (zapłacone) − koszty = zysk · ${scopeLabel}`} />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Uwzględnia płatności o statusie „Zapłacone” i wszystkie koszty.
        </div>
      )}

      {/* Filtr roku */}
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const active = selectedYear === t.k;
          const href = t.k === "all" ? "/reports" : `/reports?year=${t.k}`;
          return (
            <a
              key={t.k}
              href={href}
              className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors ${
                active ? "bg-white text-[#0b0c11]" : "border border-border bg-surface text-ink-2 hover:text-white"
              }`}
            >
              {t.label}
            </a>
          );
        })}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <MetricCard label="Przychód" value={fmtPLN(totalRev)} tone="ok" />
        <MetricCard label="Koszty" value={fmtPLN(totalCost)} tone="warn" />
        <MetricCard label="Zysk" value={fmtPLN(totalProfit)} sub={`marża ${pct(totalProfit, totalRev)}`} tone={totalProfit >= 0 ? "ok" : "bad"} />
        <MetricCard label="Zlecenia" value={String(rows.length)} />
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

      {/* Inwestycje — zwrot majątku (narastająco, poza rentownością zleceń) */}
      {investments.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="font-display text-[15px] font-bold text-white">Inwestycje — zwrot majątku</h2>
            <span className="text-[12px] font-semibold text-ink-2">narastająco, niezależnie od roku</span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <MetricCard label="Zainwestowano" value={fmtPLN(invested)} tone="warn" />
            <MetricCard label="Zysk narastająco" value={fmtPLN(cumProfit)} sub={`przychód ${fmtPLN(allRevenue)} − koszty ${fmtPLN(allOpCost)}`} tone={cumProfit >= 0 ? "ok" : "bad"} />
            <MetricCard label="Zwrot inwestycji" value={`${paybackPct}%`} tone={paybackPct >= 100 ? "ok" : "neutral"} />
            <MetricCard label="Zostało do zwrotu" value={fmtPLN(remaining)} tone={remaining > 0 ? "warn" : "ok"} />
          </div>

          <div className="mb-4 rounded-card-lg border border-border bg-surface p-5">
            <div className="mb-2 flex items-center justify-between text-[12.5px] font-semibold">
              <span className="text-ink-2">Postęp zwrotu</span>
              <span className="text-white">{fmtPLN(returned)} / {fmtPLN(invested)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#12131a]">
              <div className="h-full rounded-full" style={{ width: `${paybackPct}%`, background: paybackPct >= 100 ? "#5fd68b" : "#f59e0b" }} />
            </div>
            <p className="mt-2 text-[11.5px] text-ink-2">Inwestycje nie obciążają rentowności zleceń. Zwrot liczony z zysku narastająco (przychód − koszty bieżące).</p>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {invCats.map(([cat, sum]) => {
              const p = invested > 0 ? Math.round((sum / invested) * 100) : 0;
              return (
                <div key={cat} className="rounded-card border border-border bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_COLOR[cat] ?? "#64748b" }} />
                    <span className="text-[13px] font-bold text-white">{cat}</span>
                    <span className="ml-auto text-[12px] font-semibold text-ink-2">{p}%</span>
                  </div>
                  <div className="mt-1 font-display text-[16px] font-bold text-white">{fmtPLN(sum)}</div>
                </div>
              );
            })}
          </div>

          <details className="rounded-card border border-border bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-[13px] font-bold text-ink">Pokaż pozycje ({investments.length})</summary>
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-left">
                <thead className="border-b border-border bg-[#12131a] text-[11px] font-bold uppercase tracking-[0.5px] text-muted">
                  <tr>{["Pozycja", "Kategoria", "Kwota"].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {investments.map((i) => (
                    <tr key={i.id} className="border-b border-border-soft last:border-0">
                      <td className="px-4 py-3 text-[13px] font-bold text-ink">{i.name}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: CAT_COLOR[i.category] ?? "#64748b" }} />{i.category}</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-warn whitespace-nowrap">{fmtPLN(i.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {/* Per zlecenie */}
      <h2 className="mb-3 mt-8 font-display text-[15px] font-bold text-white">Rentowność zleceń</h2>
      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-[#12131a] text-[11px] font-bold uppercase tracking-[0.5px] text-muted">
            <tr>{["Zlecenie", "Status", "Przychód", "Koszty", "Zysk", "Marża"].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-[13px] text-ink-2">Brak zleceń w wybranym okresie.</td></tr>
            )}
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
