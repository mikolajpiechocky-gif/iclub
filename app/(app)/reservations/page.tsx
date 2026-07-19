// app/(app)/reservations/page.tsx — Lista rezerwacji (RSC, Supabase lub demo).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { PrimaryButton, EmptyState, Pill } from "@/components/ui";
import { listReservations } from "@/lib/data/reservations";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RESERVATION_STATUS_META } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";
const fmtPLN = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

export default async function ReservationsPage() {
  const reservations = await listReservations();
  const demo = !isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Rezerwacje"
        subtitle={`${reservations.length} ${reservations.length === 1 ? "rezerwacja" : "rezerwacji"}`}
        actions={<Link href="/reservations/new"><PrimaryButton icon="plus">Nowa rezerwacja</PrimaryButton></Link>}
      />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Po skonfigurowaniu Supabase lista pokaże prawdziwe rezerwacje.
        </div>
      )}

      {reservations.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="Brak rezerwacji"
          desc="Utwórz pierwszą rezerwację iClub — powstanie z niej zlecenie i etapy."
          action={<Link href="/reservations/new"><PrimaryButton icon="plus">Nowa rezerwacja</PrimaryButton></Link>}
        />
      ) : (
        <>
          {/* DESKTOP */}
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface md:block">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-[#12131a] text-[11px] font-bold uppercase tracking-[0.5px] text-muted">
                <tr>
                  {["Klient", "Impreza", "Termin", "Namiot", "Pakiet", "Zaliczka", "Status", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => {
                  const m = RESERVATION_STATUS_META[r.status];
                  return (
                    <tr key={r.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3"><Link href={`/reservations/${r.id}/edit`} className="text-[13.5px] font-bold text-ink">{r.customer?.name ?? "— bez klienta —"}</Link></td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{r.event_type || "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink">{fmtDate(r.event_date)}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{r.tent?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{r.package?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink">{fmtPLN(r.deposit)}</td>
                      <td className="px-4 py-3"><Pill label={m.label} fg={m.fg} bg={m.bg} /></td>
                      <td className="px-4 py-3 text-right"><Link href={`/reservations/${r.id}/edit`} className="text-[12.5px] font-semibold">Edytuj →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE */}
          <div className="flex flex-col gap-3 md:hidden">
            {reservations.map((r) => {
              const m = RESERVATION_STATUS_META[r.status];
              return (
                <Link key={r.id} href={`/reservations/${r.id}/edit`} className="rounded-card border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[14.5px] font-bold text-ink">{r.customer?.name ?? "— bez klienta —"}</div>
                    <Pill label={m.label} fg={m.fg} bg={m.bg} />
                  </div>
                  <div className="mt-1 text-[12.5px] font-medium text-ink-2">{[r.event_type, r.tent?.name, r.package?.name].filter(Boolean).join(" · ") || "—"}</div>
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-2">
                    <span>📅 {fmtDate(r.event_date)}</span>
                    {r.location && <span>📍 {r.location}</span>}
                    <span>💰 zaliczka {fmtPLN(r.deposit)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
