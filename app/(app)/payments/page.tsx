// app/(app)/payments/page.tsx — Płatności (RSC, Supabase lub demo). §20: widok okresowy + filtry.
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { PrimaryButton, EmptyState, Pill } from "@/components/ui";
import { Icon } from "@/components/icons";
import { PeriodBar } from "@/components/period-bar";
import { FilterSelect } from "@/components/filter-select";
import { listPayments } from "@/lib/data/payments";
import { getCurrentProfile } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PAYMENT_STATUS_META, PAYMENT_METHOD_LABELS, type PaymentStatus, type PaymentMethod } from "@/lib/data/types";
import { parsePeriod, periodContains } from "@/lib/domain/period";
import { VerifyPaymentButton } from "./verify-button";

export const dynamic = "force-dynamic";

const fmtPLN = (v: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

const UNPAID: PaymentStatus[] = ["PLANNED", "REPORTED", "OVERDUE"];

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ period?: string; method?: string; status?: string }> }) {
  const [payments, profile, sp] = await Promise.all([listPayments(), getCurrentProfile(), searchParams]);
  const demo = !isSupabaseConfigured();
  const isOwner = profile?.role === "OWNER";

  const now = new Date();
  const period = parsePeriod(sp.period, now);
  const method = sp.method && sp.method in PAYMENT_METHOD_LABELS ? (sp.method as PaymentMethod) : "";
  const status = sp.status && sp.status in PAYMENT_STATUS_META ? (sp.status as PaymentStatus) : "";

  const list = payments.filter(
    (p) =>
      periodContains(period, p.created_at) &&
      (method ? p.method === method : true) &&
      (status ? p.status === status : true),
  );

  const sumBy = (pred: (s: PaymentStatus) => boolean) => list.filter((p) => pred(p.status)).reduce((s, p) => s + Number(p.amount || 0), 0);
  const paid = sumBy((s) => s === "PAID");
  const unpaid = sumBy((s) => UNPAID.includes(s));
  const overdue = sumBy((s) => s === "OVERDUE");
  const extra = { ...(method ? { method } : {}), ...(status ? { status } : {}) };

  return (
    <div className="mx-auto max-w-[980px] px-5 py-6 md:px-8">
      <PageHeader
        title="Płatności"
        subtitle={`${list.length} pozycji · wpłynęło ${fmtPLN(paid)}`}
        actions={<Link href="/payments/new"><PrimaryButton icon="plus">Dodaj płatność</PrimaryButton></Link>}
      />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe.
        </div>
      )}

      <PeriodBar basePath="/payments" period={period} extraParams={extra} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect name="method" allLabel="Każda metoda" options={(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))} />
        <FilterSelect name="status" allLabel="Każdy status" options={(Object.keys(PAYMENT_STATUS_META) as PaymentStatus[]).map((s) => ({ value: s, label: PAYMENT_STATUS_META[s].label }))} />
      </div>

      {/* Podsumowanie przefiltrowanego widoku (§20.3). */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-3.5">
          <div className="text-[11px] font-semibold text-ink-2">Wpłynęło (zapłacone)</div>
          <div className="mt-1 font-display text-[19px] font-bold text-ok">{fmtPLN(paid)}</div>
        </div>
        <div className="rounded-card border border-border bg-surface p-3.5">
          <div className="text-[11px] font-semibold text-ink-2">Do zapłaty</div>
          <div className="mt-1 font-display text-[19px] font-bold text-warn">{fmtPLN(unpaid)}</div>
        </div>
        <div className="rounded-card border border-border bg-surface p-3.5">
          <div className="text-[11px] font-semibold text-ink-2">Zaległe</div>
          <div className="mt-1 font-display text-[19px] font-bold text-bad">{fmtPLN(overdue)}</div>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon="card" title="Brak płatności w tym widoku" desc="Zmień okres/filtry albo dodaj płatność." action={<Link href="/payments/new"><PrimaryButton icon="plus">Dodaj płatność</PrimaryButton></Link>} />
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          {list.map((p) => {
            const m = PAYMENT_STATUS_META[p.status];
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-border-soft px-4 py-3.5 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-ink">{p.title || "Płatność"} {p.job?.title && <span className="text-ink-2">· {p.job.title}</span>}</div>
                  <div className="mt-0.5 text-[12px] text-ink-2">{PAYMENT_METHOD_LABELS[p.method]}{p.note ? ` · ${p.note}` : ""}</div>
                </div>
                <div className="font-display text-[15px] font-bold text-white">{fmtPLN(p.amount)}</div>
                <Pill label={m.label} fg={m.fg} bg={m.bg} />
                {isOwner && p.status === "REPORTED" && <VerifyPaymentButton id={p.id} />}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
        <Icon name="warning" className="h-4 w-4 flex-none" />
        Gotówka „zgłoszona przez pracownika” wymaga weryfikacji szefa, zanim zostanie uznana za zapłaconą.
      </div>
    </div>
  );
}
