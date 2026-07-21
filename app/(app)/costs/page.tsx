// app/(app)/costs/page.tsx — Koszty (RSC, Supabase lub demo). §20: widok okresowy + filtry.
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { PrimaryButton, EmptyState, Pill } from "@/components/ui";
import { PeriodBar } from "@/components/period-bar";
import { FilterSelect } from "@/components/filter-select";
import { listCosts } from "@/lib/data/costs";
import { getCurrentProfile } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { COST_STATUS_META, COST_CATEGORIES, type CostStatus } from "@/lib/data/types";
import { parsePeriod, periodContains } from "@/lib/domain/period";
import { VerifyCostButton } from "./verify-button";

export const dynamic = "force-dynamic";

const fmtPLN = (v: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";

export default async function CostsPage({ searchParams }: { searchParams: Promise<{ period?: string; category?: string; status?: string }> }) {
  const [costs, profile, sp] = await Promise.all([listCosts(), getCurrentProfile(), searchParams]);
  const demo = !isSupabaseConfigured();
  const isOwner = profile?.role === "OWNER";

  const now = new Date();
  const period = parsePeriod(sp.period, now);
  const category = sp.category ?? "";
  const status = sp.status && sp.status in COST_STATUS_META ? (sp.status as CostStatus) : "";

  const list = costs.filter(
    (c) =>
      periodContains(period, c.spent_on) &&
      (category ? c.category === category : true) &&
      (status ? c.status === status : true),
  );

  const total = list.reduce((s, c) => s + Number(c.amount || 0), 0);
  const pendingList = list.filter((c) => c.status === "PENDING");
  const pendingTotal = pendingList.reduce((s, c) => s + Number(c.amount || 0), 0);
  const extra = { ...(category ? { category } : {}), ...(status ? { status } : {}) };

  return (
    <div className="mx-auto max-w-[980px] px-5 py-6 md:px-8">
      <PageHeader
        title="Koszty"
        subtitle={`${list.length} pozycji · razem ${fmtPLN(total)}`}
        actions={<Link href="/costs/new"><PrimaryButton icon="plus">Dodaj koszt</PrimaryButton></Link>}
      />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe.
        </div>
      )}

      <PeriodBar basePath="/costs" period={period} extraParams={extra} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect name="category" allLabel="Wszystkie kategorie" options={COST_CATEGORIES.map((c) => ({ value: c, label: c }))} />
        <FilterSelect name="status" allLabel="Każdy status" options={(Object.keys(COST_STATUS_META) as CostStatus[]).map((s) => ({ value: s, label: COST_STATUS_META[s].label }))} />
      </div>

      {/* Podsumowanie przefiltrowanego widoku (§20.3). */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-3.5">
          <div className="text-[11px] font-semibold text-ink-2">Suma kosztów</div>
          <div className="mt-1 font-display text-[19px] font-bold text-white">{fmtPLN(total)}</div>
        </div>
        <div className="rounded-card border border-border bg-surface p-3.5">
          <div className="text-[11px] font-semibold text-ink-2">Do weryfikacji</div>
          <div className="mt-1 font-display text-[19px] font-bold text-warn">{fmtPLN(pendingTotal)}</div>
          <div className="text-[11px] font-semibold text-ink-2">{pendingList.length} pozycji</div>
        </div>
        <div className="rounded-card border border-border bg-surface p-3.5">
          <div className="text-[11px] font-semibold text-ink-2">Pozycji</div>
          <div className="mt-1 font-display text-[19px] font-bold text-ink">{list.length}</div>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon="coins" title="Brak kosztów w tym widoku" desc="Zmień okres/filtry albo dodaj pierwszy koszt." action={<Link href="/costs/new"><PrimaryButton icon="plus">Dodaj koszt</PrimaryButton></Link>} />
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          {list.map((c) => {
            const m = COST_STATUS_META[c.status];
            return (
              <div key={c.id} className="flex flex-wrap items-center gap-3 border-b border-border-soft px-4 py-3.5 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-ink">{c.category} {c.job?.title && <span className="text-ink-2">· {c.job.title}</span>}</div>
                  <div className="mt-0.5 text-[12px] text-ink-2">{fmtDate(c.spent_on)}{c.note ? ` · ${c.note}` : ""}</div>
                </div>
                <div className="font-display text-[15px] font-bold text-white">{fmtPLN(c.amount)}</div>
                <Pill label={m.label} fg={m.fg} bg={m.bg} />
                {isOwner && c.status === "PENDING" && <VerifyCostButton id={c.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
