// app/(app)/payments/page.tsx — Płatności (RSC, Supabase lub demo).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { PrimaryButton, EmptyState, Pill } from "@/components/ui";
import { Icon } from "@/components/icons";
import { listPayments } from "@/lib/data/payments";
import { getCurrentProfile } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PAYMENT_STATUS_META, PAYMENT_METHOD_LABELS } from "@/lib/data/types";
import { VerifyPaymentButton } from "./verify-button";

export const dynamic = "force-dynamic";

const fmtPLN = (v: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

export default async function PaymentsPage() {
  const [payments, profile] = await Promise.all([listPayments(), getCurrentProfile()]);
  const demo = !isSupabaseConfigured();
  const isOwner = profile?.role === "OWNER";

  return (
    <div className="mx-auto max-w-[980px] px-5 py-6 md:px-8">
      <PageHeader
        title="Płatności"
        subtitle="Metody: gotówka, przelew, BLIK, karta"
        actions={<Link href="/payments/new"><PrimaryButton icon="plus">Dodaj płatność</PrimaryButton></Link>}
      />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe.
        </div>
      )}

      {payments.length === 0 ? (
        <EmptyState icon="card" title="Brak płatności" desc="Dodaj pierwszą płatność do zlecenia." action={<Link href="/payments/new"><PrimaryButton icon="plus">Dodaj płatność</PrimaryButton></Link>} />
      ) : (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          {payments.map((p) => {
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
        Gotówka „zgłoszona przez pracownika” wymaga weryfikacji właściciela, zanim zostanie uznana za zapłaconą.
      </div>
    </div>
  );
}
