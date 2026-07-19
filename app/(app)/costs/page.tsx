// app/(app)/costs/page.tsx — Koszty (RSC, Supabase lub demo).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { PrimaryButton, EmptyState, Pill } from "@/components/ui";
import { listCosts } from "@/lib/data/costs";
import { getCurrentProfile } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { COST_STATUS_META } from "@/lib/data/types";
import { VerifyCostButton } from "./verify-button";

export const dynamic = "force-dynamic";

const fmtPLN = (v: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";

export default async function CostsPage() {
  const [costs, profile] = await Promise.all([listCosts(), getCurrentProfile()]);
  const demo = !isSupabaseConfigured();
  const isOwner = profile?.role === "OWNER";
  const total = costs.reduce((s, c) => s + Number(c.amount || 0), 0);
  const pending = costs.filter((c) => c.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-[980px] px-5 py-6 md:px-8">
      <PageHeader
        title="Koszty"
        subtitle={`${costs.length} pozycji · razem ${fmtPLN(total)}${pending ? ` · ${pending} do weryfikacji` : ""}`}
        actions={<Link href="/costs/new"><PrimaryButton icon="plus">Dodaj koszt</PrimaryButton></Link>}
      />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe.
        </div>
      )}

      {costs.length === 0 ? (
        <EmptyState icon="coins" title="Brak kosztów" desc="Dodaj pierwszy koszt (paliwo, autostrada, materiały…)." action={<Link href="/costs/new"><PrimaryButton icon="plus">Dodaj koszt</PrimaryButton></Link>} />
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          {costs.map((c) => {
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
