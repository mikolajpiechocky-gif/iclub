// app/(app)/payments/page.tsx — Płatności (RSC).
// Pokazuje różnicę: zgłoszono odbiór / zweryfikowano / oczekuje / zaległa.
import { PageHeader } from "@/components/layout";
import { SectionCard, StatusBadge, PrimaryButton, SecondaryButton } from "@/components/ui";
import { DEMO_PAYMENTS, formatPLN } from "@/lib/demo-data";
import { Icon } from "@/components/icons";

const LEGEND = [
  { status: "reported" as const, hint: "pracownik zgłosił odbiór gotówki" },
  { status: "paid" as const, hint: "właściciel zweryfikował" },
  { status: "pending" as const, hint: "czeka na płatność" },
  { status: "conflict" as const, hint: "po terminie (zaległa)" },
];

export default function PaymentsPage() {
  return (
    <div className="mx-auto max-w-[900px] px-5 py-6 md:px-8">
      <PageHeader title="Płatności" subtitle="Metody: gotówka, przelew, BLIK, karta" />

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 rounded-card border border-border bg-surface px-4 py-3">
        {LEGEND.map((l) => (
          <span key={l.status} className="inline-flex items-center gap-2 text-[12px] text-ink-2"><StatusBadge status={l.status} /> {l.hint}</span>
        ))}
      </div>

      <SectionCard title="Zlecenie #1042 — Osiemnastka Julia N." className="p-4">
        <div className="px-4 pb-4">
          {DEMO_PAYMENTS.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 border-t border-border-soft py-3 first:border-t-0">
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-ink">{p.title}</div>
                <div className="mt-0.5 text-[12px] text-ink-2">{p.meta}</div>
              </div>
              <div className="font-display text-[15px] font-bold text-white">{formatPLN(p.amount)}</div>
              <StatusBadge status={p.status} />
              {/* Akcja weryfikacji widoczna tylko dla właściciela — TODO(backend): kontrola roli */}
              {p.status === "reported" && <PrimaryButton className="!min-h-[38px] !px-3 !text-[12px]">Zweryfikuj</PrimaryButton>}
              {p.status === "conflict" && <SecondaryButton className="!min-h-[38px] !px-3 !text-[12px]">Ponaglij</SecondaryButton>}
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="mt-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
        <Icon name="warning" className="h-4 w-4 flex-none" />
        Gotówka „zgłoszona przez pracownika” nie jest jeszcze potwierdzona — wymaga weryfikacji właściciela.
      </div>
    </div>
  );
}
