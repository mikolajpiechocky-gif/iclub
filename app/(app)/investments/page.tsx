// app/(app)/investments/page.tsx — Inwestycje / zwrot (RSC, tylko OWNER).
// Osobny rejestr majątku włożonego w iClub. NIE jest kosztem realizacji — służy
// wyłącznie do oceny, czy inwestycja się zwróciła (suma włożona vs zysk narastająco).
import { PageHeader } from "@/components/layout";
import { MetricCard, Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listInvestments } from "@/lib/data/investments";
import { listPayments } from "@/lib/data/payments";
import { listCosts } from "@/lib/data/costs";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

const fmtPLN = (v: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

const CAT_COLOR: Record<string, string> = {
  Pojazd: "#e11d74",
  Sprzęt: "#14b8c4",
  Marketing: "#f59e0b",
};

export default async function InvestmentsPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Inwestycje" subtitle="Dostępne dla właściciela" />
        <Alert tone="info" title="Brak dostępu">Rejestr inwestycji widzi tylko właściciel.</Alert>
      </div>
    );
  }

  const [investments, payments, costs] = await Promise.all([listInvestments(), listPayments(), listCosts()]);
  const demo = !isSupabaseConfigured();

  const invested = investments.reduce((s, i) => s + Number(i.amount || 0), 0);
  const revenue = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount || 0), 0);
  const opCost = costs.reduce((s, c) => s + Number(c.amount || 0), 0);
  const profit = revenue - opCost; // zysk narastająco = to, co spłaca inwestycję
  const returned = Math.max(0, profit);
  const paybackPct = invested > 0 ? Math.min(100, Math.round((returned / invested) * 100)) : 0;
  const remaining = Math.max(0, invested - returned);

  // Podział wg kategorii (malejąco).
  const byCat = new Map<string, number>();
  for (const i of investments) byCat.set(i.category, (byCat.get(i.category) ?? 0) + Number(i.amount || 0));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6 md:px-8">
      <PageHeader title="Inwestycje" subtitle="Ile włożono w iClub i ile już się zwróciło" />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe.
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <MetricCard label="Zainwestowano" value={fmtPLN(invested)} tone="warn" />
        <MetricCard label="Zysk narastająco" value={fmtPLN(profit)} sub={`przychód ${fmtPLN(revenue)} − koszty ${fmtPLN(opCost)}`} tone={profit >= 0 ? "ok" : "bad"} />
        <MetricCard label="Zwrot inwestycji" value={`${paybackPct}%`} tone={paybackPct >= 100 ? "ok" : "neutral"} />
        <MetricCard label="Zostało do zwrotu" value={fmtPLN(remaining)} tone={remaining > 0 ? "warn" : "ok"} />
      </div>

      {/* Pasek postępu zwrotu */}
      <div className="mb-6 rounded-card-lg border border-border bg-surface p-5">
        <div className="mb-2 flex items-center justify-between text-[12.5px] font-semibold">
          <span className="text-ink-2">Postęp zwrotu inwestycji</span>
          <span className="text-white">{fmtPLN(returned)} / {fmtPLN(invested)}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-[#12131a]">
          <div className="h-full rounded-full" style={{ width: `${paybackPct}%`, background: paybackPct >= 100 ? "#5fd68b" : "#f59e0b" }} />
        </div>
        <p className="mt-2 text-[11.5px] text-ink-2">
          Zwrot liczony z zysku narastająco (przychód − koszty bieżące). Inwestycje nie obciążają rentowności pojedynczych zleceń.
        </p>
      </div>

      {/* Podział wg kategorii */}
      {cats.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {cats.map(([cat, sum]) => {
            const p = invested > 0 ? Math.round((sum / invested) * 100) : 0;
            const color = CAT_COLOR[cat] ?? "#64748b";
            return (
              <div key={cat} className="rounded-card border border-border bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-[13px] font-bold text-white">{cat}</span>
                  <span className="ml-auto text-[12px] font-semibold text-ink-2">{p}%</span>
                </div>
                <div className="mt-1 font-display text-[18px] font-bold text-white">{fmtPLN(sum)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista pozycji */}
      <h2 className="mb-3 font-display text-[15px] font-bold text-white">Pozycje ({investments.length})</h2>
      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full text-left">
          <thead className="border-b border-border bg-[#12131a] text-[11px] font-bold uppercase tracking-[0.5px] text-muted">
            <tr>{["Pozycja", "Kategoria", "Kwota"].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {investments.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-[13px] text-ink-2">Brak inwestycji. Uruchom seed 0026 w Supabase.</td></tr>
            )}
            {investments.map((i) => (
              <tr key={i.id} className="border-b border-border-soft last:border-0">
                <td className="px-4 py-3 text-[13px] font-bold text-ink">{i.name}</td>
                <td className="px-4 py-3 text-[13px] text-ink-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: CAT_COLOR[i.category] ?? "#64748b" }} />
                    {i.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] font-semibold text-warn whitespace-nowrap">{fmtPLN(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
