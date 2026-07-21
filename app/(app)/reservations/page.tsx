// app/(app)/reservations/page.tsx — Lista rezerwacji (RSC, Supabase lub demo).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { PrimaryButton, EmptyState, Pill } from "@/components/ui";
import { listReservations } from "@/lib/data/reservations";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { RESERVATION_STATUS_META, type ReservationRecord } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";
const fmtPLN = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

// §4.2 Filtry z pulpitu (klikalne kafelki prowadzą do przefiltrowanej listy).
const FILTERS: Record<string, { label: string; test: (r: ReservationRecord, ctx: { todayStr: string; plus7Str: string }) => boolean }> = {
  "unconfirmed": {
    label: "Niepotwierdzone",
    // Aktywna rezerwacja bez podpisanej umowy LUB bez wpłaconego zadatku.
    // (numeric z Postgresa bywa stringiem "0.00" — koercja przed porównaniem.)
    test: (r) => (r.status === "TEMPORARY" || r.status === "CONFIRMED") && (!r.client_confirmed || !Number(r.deposit)),
  },
  "upcoming7": {
    label: "Najbliższe (7 dni)",
    test: (r, c) => !!r.event_date && r.event_date >= c.todayStr && r.event_date <= c.plus7Str && r.status !== "CANCELLED",
  },
  "upcoming": {
    label: "Nadchodzące realizacje",
    test: (r, c) => !!r.event_date && r.event_date >= c.todayStr && r.status !== "CANCELLED",
  },
  "to-confirm": {
    label: "Do potwierdzenia (≤7 dni)",
    test: (r, c) => !!r.event_date && r.event_date >= c.todayStr && r.event_date <= c.plus7Str && r.status !== "CANCELLED" && !r.client_confirmed,
  },
  "invoice-todo": {
    label: "Faktura do wystawienia",
    test: (r, c) => r.is_invoice && !r.invoice_issued && r.status !== "CANCELLED" && !!r.event_date && r.event_date <= c.todayStr,
  },
};

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const [reservations, sp] = await Promise.all([listReservations(), searchParams]);
  const demo = !isSupabaseConfigured();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const plus7 = new Date(now);
  plus7.setDate(now.getDate() + 7);
  const plus7Str = plus7.toISOString().slice(0, 10);

  const activeFilter = sp.filter && FILTERS[sp.filter] ? sp.filter : null;
  const list = activeFilter
    ? reservations.filter((r) => FILTERS[activeFilter].test(r, { todayStr, plus7Str }))
    : reservations;

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Rezerwacje"
        subtitle={`${list.length} ${list.length === 1 ? "rezerwacja" : "rezerwacji"}${activeFilter ? ` · filtr: ${FILTERS[activeFilter].label}` : ""}`}
        actions={<Link href="/reservations/new"><PrimaryButton icon="plus">Nowa rezerwacja</PrimaryButton></Link>}
      />

      {activeFilter && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-border bg-surface-2 px-4 py-2.5 text-[12.5px]">
          <span className="font-semibold text-ink">Filtr: {FILTERS[activeFilter].label}</span>
          <Link href="/reservations" className="ml-auto font-semibold text-accent-soft">Wyczyść ✕</Link>
        </div>
      )}

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Po skonfigurowaniu Supabase lista pokaże prawdziwe rezerwacje.
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title={activeFilter ? "Brak pasujących rezerwacji" : "Brak rezerwacji"}
          desc={activeFilter ? "Żadna rezerwacja nie spełnia wybranego filtra." : "Utwórz pierwszą rezerwację iClub — od razu staje się realizacją z etapami."}
          action={<Link href="/reservations/new"><PrimaryButton icon="plus">Nowa rezerwacja</PrimaryButton></Link>}
        />
      ) : (
        <>
          {/* DESKTOP */}
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface md:block">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-[#12131a] text-[11px] font-bold uppercase tracking-[0.5px] text-muted">
                <tr>
                  {["Klient", "Impreza", "Termin", "Namiot", "Pakiet", "Zadatek", "Status", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const m = RESERVATION_STATUS_META[r.status];
                  return (
                    <tr key={r.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3"><Link href={`/reservations/${r.id}`} className="text-[13.5px] font-bold text-ink">{r.customer?.name ?? "— bez klienta —"}</Link></td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{r.event_type || "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink">{fmtDate(r.event_date)}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{r.tent?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{r.package?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink">{fmtPLN(r.deposit)}</td>
                      <td className="px-4 py-3"><Pill label={m.label} fg={m.fg} bg={m.bg} /></td>
                      <td className="px-4 py-3 text-right"><Link href={`/reservations/${r.id}`} className="text-[12.5px] font-semibold">Otwórz →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE */}
          <div className="flex flex-col gap-3 md:hidden">
            {list.map((r) => {
              const m = RESERVATION_STATUS_META[r.status];
              return (
                <Link key={r.id} href={`/reservations/${r.id}`} className="rounded-card border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[14.5px] font-bold text-ink">{r.customer?.name ?? "— bez klienta —"}</div>
                    <Pill label={m.label} fg={m.fg} bg={m.bg} />
                  </div>
                  <div className="mt-1 text-[12.5px] font-medium text-ink-2">{[r.event_type, r.tent?.name, r.package?.name].filter(Boolean).join(" · ") || "—"}</div>
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-2">
                    <span>📅 {fmtDate(r.event_date)}</span>
                    {r.location && <span>📍 {r.location}</span>}
                    <span>💰 zadatek {fmtPLN(r.deposit)}</span>
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
