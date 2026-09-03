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
import { listReservations } from "@/lib/data/reservations";
import { listAddons, listReservationAddons } from "@/lib/data/resources";
import { settlementBreakdown, type AddonPriceMap } from "@/lib/domain/billing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { JOB_STATUS_META, type JobWithReservation } from "@/lib/data/types";
import { warsawTodayISO } from "@/lib/domain/dates";
import { BackfillCostsButton } from "./backfill-button";

// Kolor kategorii kosztu (rozbicie w podsumowaniu miesiąca) — reszta na neutralnym.
const COST_CAT_COLOR: Record<string, string> = {
  Wynagrodzenie: "#e11d74", Robocizna: "#b98cf5", Paliwo: "#f59e0b", Transport: "#f59e0b",
  Sprzęt: "#14b8c4", Pojazd: "#3b82f6", Marketing: "#22c55e", Autostrada: "#64748b",
  Szampan: "#eab308", "Pałeczki fluo": "#a3e635", Hotel: "#8b5cf6", Dieta: "#f472b6", Materiały: "#0ea5e9",
};
const REV_CAT_COLOR: Record<string, string> = {
  Pakiet: "#e11d74", Dodatki: "#b98cf5", Transport: "#f59e0b", "Wypożyczalnia": "#14b8c4",
  "Realizacje iClub": "#e11d74", "Inne": "#64748b",
};

export const dynamic = "force-dynamic";

const fmtPLN = (v: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

const CAT_COLOR: Record<string, string> = { Pojazd: "#e11d74", Sprzęt: "#14b8c4", Marketing: "#f59e0b" };

// Rok realizacji zlecenia: z daty zlecenia, w razie braku z rezerwacji.
const jobYear = (j: JobWithReservation): string =>
  (j.event_date ?? j.reservation?.event_date ?? "").slice(0, 4);
const jobMonthNum = (j: JobWithReservation): string =>
  (j.event_date ?? j.reservation?.event_date ?? "").slice(5, 7);
const MONTHS_PL = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string; view?: string }> }) {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Raporty" subtitle="Dostępne dla szefa" />
        <Alert tone="info" title="Brak dostępu">Rentowność i pełne finanse widzi tylko szef.</Alert>
      </div>
    );
  }

  const [jobs, payments, costs, investments, reservations, addons, resAddons] = await Promise.all([listJobs(), listPayments(), listCosts(), listInvestments(), listReservations(), listAddons(), listReservationAddons()]);
  const demo = !isSupabaseConfigured();

  // Dwie karty: „Podsumowanie miesiąca" (domyślna) i „Rentowność" (dotychczasowy widok).
  const { year: yearParam, month: monthParam, view: viewParam } = await searchParams;
  const view: "summary" | "details" = viewParam === "details" ? "details" : "summary";

  // Dostępne lata (malejąco) + wybór z URL.
  const years = Array.from(new Set(jobs.map(jobYear).filter(Boolean))).sort().reverse();
  const today = warsawTodayISO();
  const curY = today.slice(0, 4);
  const curM = today.slice(5, 7);
  // Podsumowanie bez filtrów → domyślnie BIEŻĄCY miesiąc (jeśli ma dane); reszta jak dotąd („Wszystko").
  const noFilters = !yearParam && !monthParam;
  const defaultYear = view === "summary" && noFilters && years.includes(curY) ? curY : "all";
  const selectedYear = yearParam && years.includes(yearParam) ? yearParam : defaultYear;
  // Miesiące z danymi w wybranym roku + wybór miesiąca (tylko gdy rok jest wybrany).
  const monthsInYear = selectedYear === "all"
    ? []
    : Array.from(new Set(jobs.filter((j) => jobYear(j) === selectedYear).map(jobMonthNum).filter(Boolean))).sort();
  const defaultMonth = view === "summary" && noFilters && selectedYear === curY && monthsInYear.includes(curM) ? curM : "";
  const selectedMonth = selectedYear !== "all" && monthParam && monthsInYear.includes(monthParam) ? monthParam : defaultMonth;

  const paidByJob = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "PAID" || !p.job_id) continue;
    paidByJob.set(p.job_id, (paidByJob.get(p.job_id) ?? 0) + Number(p.amount || 0));
  }
  const costByJob = new Map<string, number>();
  const costItemsByJob = new Map<string, { category: string; note: string | null; amount: number; status: string }[]>();
  for (const c of costs) {
    if (!c.job_id || c.status === "REJECTED") continue; // odrzucone koszty nie liczą się (spójnie z Koszty/rentownością)
    costByJob.set(c.job_id, (costByJob.get(c.job_id) ?? 0) + Number(c.amount || 0));
    const arr = costItemsByJob.get(c.job_id) ?? [];
    arr.push({ category: c.category, note: c.note, amount: Number(c.amount || 0), status: c.status });
    costItemsByJob.set(c.job_id, arr);
  }

  const rows = jobs
    .filter((j) => (selectedYear === "all" || jobYear(j) === selectedYear) && (!selectedMonth || jobMonthNum(j) === selectedMonth))
    .map((j) => {
      const rev = paidByJob.get(j.id) ?? 0;
      const cost = costByJob.get(j.id) ?? 0;
      return { job: j, rev, cost, profit: rev - cost };
    });

  // §koszty ogólne Koszty ręczne BEZ zlecenia (ogólne albo przypisane do linii) — w zakresie po DACIE wydatku,
  // żeby liczyły się do sum i rozbić (dotąd koszt bez job_id był niewidoczny w finansach).
  const inScopeByDate = (d: string | null): boolean => {
    if (selectedYear === "all") return true;
    if (!d) return false;
    if (d.slice(0, 4) !== selectedYear) return false;
    if (selectedMonth && d.slice(5, 7) !== selectedMonth) return false;
    return true;
  };
  const manualCosts = costs.filter((c) => !c.job_id && c.status !== "REJECTED" && inScopeByDate(c.spent_on));
  const manualCostTotal = manualCosts.reduce((s, c) => s + Number(c.amount || 0), 0);
  const manualByLine = (line: string) => manualCosts.filter((c) => c.business_line === line).reduce((s, c) => s + Number(c.amount || 0), 0);

  const totalRev = rows.reduce((s, r) => s + r.rev, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0) + manualCostTotal;
  const totalProfit = totalRev - totalCost;

  // §podsumowanie Rozbicie kosztów na kategorie (dla wybranego zakresu) — do widoku „Podsumowanie miesiąca".
  const costByCat = new Map<string, number>();
  for (const r of rows) {
    for (const it of costItemsByJob.get(r.job.id) ?? []) {
      if (it.status === "REJECTED") continue;
      costByCat.set(it.category, (costByCat.get(it.category) ?? 0) + it.amount);
    }
  }
  for (const c of manualCosts) costByCat.set(c.category, (costByCat.get(c.category) ?? 0) + Number(c.amount || 0)); // koszty ręczne bez zlecenia
  const costCats = [...costByCat.entries()].sort((a, b) => b[1] - a[1]);
  const costCatMax = Math.max(1, ...costCats.map(([, v]) => v));

  // §podsumowanie Rozbicie PRZYCHODÓW na REALNE składowe: Pakiet / Dodatki / Transport (iClub) + Wypożyczalnia.
  // Kwotę ZAPŁACONĄ danej realizacji dzielimy proporcjonalnie do jej składu wyceny, więc suma
  // składowych = Wpływy (nie mieszamy wyceny teoretycznej z realnie zapłaconym).
  const addonPrice: AddonPriceMap = new Map(resAddons.map((a) => [a.id, { name: a.name, price: Number(a.price ?? 0) }]));
  const resById = new Map(reservations.map((r) => [r.id, r]));
  const revByCat = new Map<string, number>();
  const addRev = (k: string, v: number) => { if (v > 0.005) revByCat.set(k, (revByCat.get(k) ?? 0) + Math.round(v * 100) / 100); };
  for (const row of rows) {
    const paid = row.rev;
    if (paid <= 0) continue;
    if (row.job.business_line === "EQUIPMENT_RENTAL") { addRev("Wypożyczalnia", paid); continue; }
    const res = row.job.reservation?.id ? resById.get(row.job.reservation.id) : null;
    if (!res) { addRev("Realizacje iClub", paid); continue; }
    const b = settlementBreakdown(res, addonPrice);
    const gross = b.packagePrice + b.addonsTotal + b.transport;
    if (gross <= 0) { addRev("Realizacje iClub", paid); continue; }
    addRev("Pakiet", paid * (b.packagePrice / gross));
    addRev("Dodatki", paid * (b.addonsTotal / gross));
    addRev("Transport", paid * (b.transport / gross));
  }
  const revCats = [...revByCat.entries()].sort((a, b) => b[1] - a[1]);
  const revCatMax = Math.max(1, ...revCats.map(([, v]) => v));

  const byLine = (line: "ICLUB" | "EQUIPMENT_RENTAL") => {
    const rs = rows.filter((r) => r.job.business_line === line);
    const rev = rs.reduce((s, r) => s + r.rev, 0);
    const cost = rs.reduce((s, r) => s + r.cost, 0) + manualByLine(line); // + koszty ręczne przypisane do linii
    return { rev, cost, profit: rev - cost, count: rs.length };
  };
  const iclub = byLine("ICLUB");
  const rental = byLine("EQUIPMENT_RENTAL");

  // Inwestycje (majątek) — narastająco, niezależnie od filtra roku. NIE są kosztem
  // realizacji; zwrot liczony z zysku narastająco (przychód − koszty bieżące).
  const invested = investments.reduce((s, i) => s + Number(i.amount || 0), 0);
  const allRevenue = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount || 0), 0);
  const allOpCost = costs.filter((c) => c.status !== "REJECTED").reduce((s, c) => s + Number(c.amount || 0), 0);
  const cumProfit = allRevenue - allOpCost;
  const returned = Math.max(0, cumProfit);
  const paybackPct = invested > 0 ? Math.min(100, Math.round((returned / invested) * 100)) : 0;
  const remaining = Math.max(0, invested - returned);
  const invByCat = new Map<string, number>();
  for (const i of investments) invByCat.set(i.category, (invByCat.get(i.category) ?? 0) + Number(i.amount || 0));
  const invCats = [...invByCat.entries()].sort((a, b) => b[1] - a[1]);

  const scopeLabel = selectedYear === "all" ? "od początku" : selectedMonth ? `${MONTHS_PL[Number(selectedMonth) - 1]} ${selectedYear}` : `rok ${selectedYear}`;
  const tabs = [{ k: "all", label: "Wszystko" }, ...years.map((y) => ({ k: y, label: y }))];

  // Linki zachowujące bieżącą kartę (view) i filtr; pomijają wartości domyślne (summary, „Wszystko").
  const hrefFor = (v: "summary" | "details", y?: string, m?: string) => {
    const p = new URLSearchParams();
    if (v === "details") p.set("view", "details");
    if (y && y !== "all") p.set("year", y);
    if (m) p.set("month", m);
    const q = p.toString();
    return q ? `/reports?${q}` : "/reports";
  };

  const viewTabs = (
    <div className="mb-4 flex gap-2">
      {([["summary", "Podsumowanie miesiąca"], ["details", "Rentowność"]] as const).map(([v, label]) => (
        <a key={v} href={hrefFor(v, selectedYear, selectedMonth)} className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors ${view === v ? "bg-brand text-white" : "border border-border bg-surface text-ink-2 hover:text-white"}`}>{label}</a>
      ))}
    </div>
  );

  const filterUI = (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <a key={t.k} href={hrefFor(view, t.k)} className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors ${selectedYear === t.k ? "bg-white text-[#0b0c11]" : "border border-border bg-surface text-ink-2 hover:text-white"}`}>{t.label}</a>
        ))}
      </div>
      {selectedYear !== "all" && monthsInYear.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <a href={hrefFor(view, selectedYear)} className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${!selectedMonth ? "bg-accent text-white" : "border border-border bg-surface text-ink-2 hover:text-white"}`}>Cały rok</a>
          {monthsInYear.map((m) => (
            <a key={m} href={hrefFor(view, selectedYear, m)} className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${selectedMonth === m ? "bg-accent text-white" : "border border-border bg-surface text-ink-2 hover:text-white"}`}>{MONTHS_PL[Number(m) - 1]}</a>
          ))}
        </div>
      )}
    </>
  );

  const demoBanner = demo && (
    <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
      Tryb demo — dane przykładowe. Uwzględnia płatności o statusie „Zapłacone” i wszystkie koszty.
    </div>
  );

  // ═══════════ KARTA 1: Podsumowanie miesiąca ═══════════
  if (view === "summary") {
    return (
      <div className="mx-auto max-w-[1000px] px-5 py-6 md:px-8">
        <PageHeader title="Podsumowanie miesiąca" subtitle={`Wpływy − koszty = zysk · ${scopeLabel}`} />
        {demoBanner}
        {viewTabs}
        {filterUI}

        <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <MetricCard label="Wpływy" value={fmtPLN(totalRev)} tone="ok" />
          <MetricCard label="Koszty" value={fmtPLN(totalCost)} tone="warn" />
          <MetricCard label="Zysk" value={fmtPLN(totalProfit)} sub={`marża ${pct(totalProfit, totalRev)}`} tone={totalProfit >= 0 ? "ok" : "bad"} />
          <MetricCard label="Realizacje" value={String(rows.length)} />
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[{ name: "iClub", d: iclub, c: "#e11d74" }, { name: "Wypożyczalnia", d: rental, c: "#14b8c4" }].map((l) => (
            <div key={l.name} className="rounded-card-lg border border-border bg-surface p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.c }} />
                <h2 className="font-display text-[15px] font-bold text-white">{l.name}</h2>
                <span className="ml-auto text-[12px] font-semibold text-ink-2">{l.d.count} real.</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><div className="text-[11px] font-semibold text-ink-2">Wpływy</div><div className="mt-0.5 font-display text-[16px] font-bold text-ok">{fmtPLN(l.d.rev)}</div></div>
                <div><div className="text-[11px] font-semibold text-ink-2">Koszty</div><div className="mt-0.5 font-display text-[16px] font-bold text-warn">{fmtPLN(l.d.cost)}</div></div>
                <div><div className="text-[11px] font-semibold text-ink-2">Zysk</div><div className="mt-0.5 font-display text-[16px] font-bold" style={{ color: l.d.profit >= 0 ? "#5fd68b" : "#f58585" }}>{fmtPLN(l.d.profit)}</div></div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-card-lg border border-border bg-surface p-5">
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="font-display text-[15px] font-bold text-white">Przychody wg składowych</h2>
              <span className="ml-auto font-display text-[15px] font-bold text-ok">{fmtPLN(totalRev)}</span>
            </div>
            {revCats.length === 0 ? (
              <p className="text-[12.5px] text-ink-2">Brak przychodów w tym okresie.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {revCats.map(([cat, sum]) => (
                  <div key={cat}>
                    <div className="mb-1 flex items-center gap-2 text-[13px]">
                      <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: REV_CAT_COLOR[cat] ?? "#5fd68b" }} />
                      <span className="font-semibold text-ink">{cat}</span>
                      <span className="ml-auto font-bold text-white">{fmtPLN(sum)}</span>
                      <span className="w-10 text-right text-[11.5px] font-semibold text-ink-2">{pct(sum, totalRev)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#12131a]">
                      <div className="h-full rounded-full" style={{ width: `${Math.round((sum / revCatMax) * 100)}%`, background: REV_CAT_COLOR[cat] ?? "#5fd68b" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-card-lg border border-border bg-surface p-5">
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="font-display text-[15px] font-bold text-white">Koszty wg kategorii</h2>
              <span className="ml-auto font-display text-[15px] font-bold text-warn">{fmtPLN(totalCost)}</span>
            </div>
            {costCats.length === 0 ? (
              <p className="text-[12.5px] text-ink-2">Brak kosztów w tym okresie.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {costCats.map(([cat, sum]) => (
                  <div key={cat}>
                    <div className="mb-1 flex items-center gap-2 text-[13px]">
                      <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: COST_CAT_COLOR[cat] ?? "#64748b" }} />
                      <span className="font-semibold text-ink">{cat}</span>
                      <span className="ml-auto font-bold text-white">{fmtPLN(sum)}</span>
                      <span className="w-10 text-right text-[11.5px] font-semibold text-ink-2">{pct(sum, totalCost)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#12131a]">
                      <div className="h-full rounded-full" style={{ width: `${Math.round((sum / costCatMax) * 100)}%`, background: COST_CAT_COLOR[cat] ?? "#64748b" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-ink-2">Przychód = płatności „Zapłacone” (wartość realizacji księguje się automatycznie przy domknięciu); koszty = wszystkie poza odrzuconymi, w zakresie {scopeLabel}. Pełna rentowność per realizacja — w karcie „Rentowność”.</p>
      </div>
    );
  }

  // §B4 Ranking „co najlepiej się wypożycza": przychód i liczba wypożyczeń per dodatek.
  // Pomija rezerwacje tymczasowe (niepotwierdzone przytrzymania). Respektuje filtr roku.
  const addonById = new Map(addons.map((a) => [a.id, a]));
  const addonAgg = new Map<string, { name: string; rentals: number; qty: number; revenue: number }>();
  for (const r of reservations) {
    if (r.status === "TEMPORARY") continue;
    if (selectedYear !== "all" && (r.event_date ?? "").slice(0, 4) !== selectedYear) continue;
    if (selectedMonth && (r.event_date ?? "").slice(5, 7) !== selectedMonth) continue;
    for (const id of r.addon_ids ?? []) {
      const a = addonById.get(id);
      if (!a) continue;
      const q = r.addon_qty?.[id] ?? 1;
      const cur = addonAgg.get(id) ?? { name: a.name, rentals: 0, qty: 0, revenue: 0 };
      cur.rentals += 1;
      cur.qty += q;
      cur.revenue += Number(a.price || 0) * q;
      addonAgg.set(id, cur);
    }
  }
  const addonRanking = [...addonAgg.values()].sort((a, b) => b.revenue - a.revenue);
  const addonMaxRev = Math.max(1, ...addonRanking.map((r) => r.revenue));

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6 md:px-8">
      <PageHeader title="Raporty i rentowność" subtitle={`Przychód (zapłacone) − koszty = zysk · ${scopeLabel}`} />

      {demoBanner}
      {viewTabs}
      {filterUI}

      <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <MetricCard label="Przychód" value={fmtPLN(totalRev)} tone="ok" />
        <MetricCard label="Koszty" value={fmtPLN(totalCost)} tone="warn" />
        <MetricCard label="Zysk" value={fmtPLN(totalProfit)} sub={`marża ${pct(totalProfit, totalRev)}`} tone={totalProfit >= 0 ? "ok" : "bad"} />
        <MetricCard label="Zlecenia" value={String(rows.length)} />
      </div>

      {/* Per linia biznesowa */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { name: "iClub", d: iclub, c: "#e11d74" },
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

      {/* §B4 Co najlepiej się wypożycza — ranking dodatków po przychodzie */}
      {addonRanking.length > 0 && (
        <>
          <h2 className="mb-1 mt-8 font-display text-[15px] font-bold text-white">Co najlepiej się wypożycza</h2>
          <p className="mb-3 text-[12px] text-ink-2">Ranking dodatków po przychodzie z wypożyczeń ({scopeLabel}). Przychód = cena × ilość × liczba rezerwacji.</p>
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            {addonRanking.slice(0, 20).map((a, idx) => (
              <div key={a.name} className="flex items-center gap-3 border-b border-border-soft px-4 py-3 last:border-0">
                <span className="w-5 flex-none text-[13px] font-bold text-ink-2">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-bold text-ink">{a.name}</span>
                    <span className="flex-none font-display text-[13.5px] font-bold text-ok">{fmtPLN(a.revenue)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${Math.round((a.revenue / addonMaxRev) * 100)}%`, background: "linear-gradient(90deg,#5fd68b,#14b8c4)" }} />
                  </div>
                  <div className="mt-1 text-[11px] text-ink-2">{a.rentals} {a.rentals === 1 ? "wypożyczenie" : "wypożyczeń"} · {a.qty} szt. łącznie</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Per zlecenie — każda realizacja z sumą kosztów; po rozwinięciu rozbicie na pozycje */}
      <h2 className="mb-1 mt-8 font-display text-[15px] font-bold text-white">Rentowność zleceń</h2>
      <p className="mb-3 text-[12px] text-ink-2">Kliknij realizację, aby zobaczyć rozbicie kosztów (wynagrodzenia, paliwo, pozostałe).</p>
      <BackfillCostsButton />
      <div className="flex flex-col gap-2">
        {rows.length === 0 && (
          <div className="rounded-card border border-border bg-surface px-4 py-6 text-center text-[13px] text-ink-2">Brak zleceń w wybranym okresie.</div>
        )}
        {rows.map((r) => {
          const m = JOB_STATUS_META[r.job.status];
          const items = costItemsByJob.get(r.job.id) ?? [];
          const name = r.job.reservation?.customer?.name ?? r.job.title ?? "Zlecenie";
          return (
            <details key={r.job.id} className="overflow-hidden rounded-card border border-border bg-surface">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <span className="min-w-[120px] flex-1 truncate text-[13.5px] font-bold text-ink">{name}</span>
                <Pill label={m.label} fg={m.fg} bg={m.bg} />
                <span className="text-[12px] text-ok">{fmtPLN(r.rev)}</span>
                <span className="text-[12px] text-warn">− {fmtPLN(r.cost)}</span>
                <span className="text-[13px] font-bold" style={{ color: r.profit >= 0 ? "#5fd68b" : "#f58585" }}>{fmtPLN(r.profit)}</span>
                <span className="w-12 text-right text-[11.5px] text-ink-2">{pct(r.profit, r.rev)}</span>
              </summary>
              <div className="border-t border-border px-4 py-3">
                <div className="mb-1.5 flex items-center justify-between text-[12px] font-semibold"><span className="text-ink-2">Przychód (zapłacone)</span><span className="text-ok">{fmtPLN(r.rev)}</span></div>
                {items.length ? (
                  <ul className="flex flex-col gap-1">
                    {items.map((it, i) => (
                      <li key={i} className="flex items-center justify-between text-[12px]">
                        <span className="min-w-0 truncate pr-2 text-ink-2">{it.category}{it.note ? ` · ${it.note}` : ""}{it.status === "PENDING" ? " · do weryfikacji" : ""}</span>
                        <span className="flex-none font-semibold text-ink">− {fmtPLN(it.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-[12px] text-ink-2">Brak zapisanych kosztów dla tej realizacji.</p>}
                <div className="mt-2 flex items-center justify-between border-t border-border-soft pt-2 text-[12.5px] font-bold"><span className="text-ink">Zysk</span><span style={{ color: r.profit >= 0 ? "#5fd68b" : "#f58585" }}>{fmtPLN(r.profit)}</span></div>
                <a href={`/reservations/${r.job.reservation_id ?? ""}`} className="mt-2 inline-block text-[12px] font-semibold text-accent-soft">Otwórz realizację →</a>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
