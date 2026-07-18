// app/(app)/inquiries/page.tsx — Lista zapytań (RSC).
// Desktop: tabela. Mobile: karty (tabela zamieniona na listę kart).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { StatusBadge, PrimaryButton, EmptyState } from "@/components/ui";
import { DEMO_INQUIRIES } from "@/lib/demo-data";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" });

export default function InquiriesPage() {
  const rows = DEMO_INQUIRIES;
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Zapytania"
        subtitle={`${rows.length} zapytań · źródła: OLX, telefon, formularz, polecenie, Facebook, Instagram`}
        actions={<PrimaryButton icon="plus">Nowe zapytanie</PrimaryButton>}
      />

      {rows.length === 0 ? (
        <EmptyState title="Brak zapytań" desc="Nowe zapytania z OLX, Instagrama i formularza pojawią się tutaj." action={<PrimaryButton icon="plus">Dodaj ręcznie</PrimaryButton>} />
      ) : (
        <>
          {/* DESKTOP: tabela */}
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface md:block">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-[#12131a] text-[11px] font-bold uppercase tracking-[0.5px] text-muted">
                <tr>
                  {["Klient", "Źródło", "Data imprezy", "Miejscowość", "Osoby", "Zainteresowanie", "Status", "Prowadzi", "Ostatni kontakt"].map((h) => (
                    <th key={h} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-3"><Link href="/reservations/new" className="text-[13.5px] font-bold text-ink">{r.customer}</Link></td>
                    <td className="px-4 py-3 text-[13px] text-ink-2">{r.source}</td>
                    <td className="px-4 py-3 text-[13px] text-ink">{fmtDate(r.eventDate)}</td>
                    <td className="px-4 py-3 text-[13px] text-ink-2">{r.city}</td>
                    <td className="px-4 py-3 text-[13px] text-ink">{r.guests}</td>
                    <td className="px-4 py-3 text-[13px] text-ink-2">{r.interest}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-[13px] text-ink-2">{r.owner}</td>
                    <td className="px-4 py-3 text-[13px] text-ink-2">{fmtDate(r.lastContact)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE: karty */}
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((r) => (
              <Link key={r.id} href="/reservations/new" className="rounded-card border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[14.5px] font-bold text-ink">{r.customer}</div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-1 text-[12.5px] font-medium text-ink-2">{r.interest}</div>
                <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-2">
                  <span>📅 {fmtDate(r.eventDate)}</span>
                  <span>📍 {r.city}</span>
                  <span>👥 {r.guests} os.</span>
                  <span>🔗 {r.source}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
