// app/(app)/reservations/page.tsx — Lista rezerwacji (RSC, Supabase lub demo).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { PrimaryButton, EmptyState, Pill } from "@/components/ui";
import { listReservations } from "@/lib/data/reservations";
import { listJobs } from "@/lib/data/jobs";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { type ReservationRecord } from "@/lib/data/types";

export const dynamic = "force-dynamic";

// Kolory linii biznesowej — spójne z Google Calendar (iClub = winogrono/flaming, wypożyczalnia = szałwia).
const LINE_META: Record<string, { label: string; fg: string; bg: string }> = {
  ICLUB: { label: "iClub", fg: "#c9a6ff", bg: "#271b3f" },
  EQUIPMENT_RENTAL: { label: "Wypożyczalnia", fg: "#5fd68b", bg: "#16301f" },
};
// Status realizacji (z job.status): zrealizowana / niezrealizowana / anulowana.
function realizedMeta(jobStatus: string | undefined, resStatus: string): { label: string; fg: string; bg: string } {
  if (resStatus === "CANCELLED") return { label: "Anulowana", fg: "#9aa0b2", bg: "#22242e" };
  if (jobStatus === "DONE") return { label: "Zrealizowana", fg: "#5fd68b", bg: "#16301f" };
  return { label: "Niezrealizowana", fg: "#ebb05a", bg: "#332814" };
}

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

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ filter?: string; line?: string }> }) {
  const [reservations, jobs, sp] = await Promise.all([listReservations(), listJobs(), searchParams]);
  const demo = !isSupabaseConfigured();
  // Status realizacji per rezerwacja (z powiązanego zlecenia).
  const jobStatusByRes = new Map<string, string>();
  for (const j of jobs) if (j.reservation_id) jobStatusByRes.set(j.reservation_id, j.status);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const plus7 = new Date(now);
  plus7.setDate(now.getDate() + 7);
  const plus7Str = plus7.toISOString().slice(0, 10);

  const activeFilter = sp.filter && FILTERS[sp.filter] ? sp.filter : null;
  const activeLine = sp.line === "ICLUB" || sp.line === "EQUIPMENT_RENTAL" ? sp.line : null;
  let list = activeFilter
    ? reservations.filter((r) => FILTERS[activeFilter].test(r, { todayStr, plus7Str }))
    : reservations;
  if (activeLine) list = list.filter((r) => r.business_line === activeLine);
  const lineHref = (line: string | null) => {
    const p = new URLSearchParams();
    if (activeFilter) p.set("filter", activeFilter);
    if (line) p.set("line", line);
    const q = p.toString();
    return `/reservations${q ? `?${q}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Rezerwacje"
        subtitle={`${list.length} ${list.length === 1 ? "rezerwacja" : "rezerwacji"}${activeFilter ? ` · filtr: ${FILTERS[activeFilter].label}` : ""}`}
        actions={<Link href="/reservations/new"><PrimaryButton icon="plus">Nowa rezerwacja</PrimaryButton></Link>}
      />

      {/* Filtr linii biznesowej */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[{ key: null, label: "Wszystkie" }, { key: "ICLUB", label: "iClub" }, { key: "EQUIPMENT_RENTAL", label: "Wypożyczalnia" }].map((opt) => {
          const active = activeLine === opt.key;
          const meta = opt.key ? LINE_META[opt.key] : null;
          return (
            <Link key={opt.label} href={lineHref(opt.key)} className="rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold" style={active ? { background: meta?.bg ?? "#271b3f", color: meta?.fg ?? "#c9a6ff", borderColor: meta?.fg ?? "#c9a6ff" } : { background: "transparent", color: "#9aa0b2", borderColor: "#2a2d3a" }}>
              {opt.label}
            </Link>
          );
        })}
      </div>

      {activeFilter && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-border bg-surface-2 px-4 py-2.5 text-[12.5px]">
          <span className="font-semibold text-ink">Filtr: {FILTERS[activeFilter].label}</span>
          <Link href={activeLine ? `/reservations?line=${activeLine}` : "/reservations"} className="ml-auto font-semibold text-accent-soft">Wyczyść ✕</Link>
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
                  {["Klient", "Termin", "Czego dotyczy", "Wartość", "Status", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const line = LINE_META[r.business_line] ?? { label: r.business_line, fg: "#9aa0b2", bg: "#22242e" };
                  const st = realizedMeta(jobStatusByRes.get(r.id), r.status);
                  const covers = r.business_line === "EQUIPMENT_RENTAL"
                    ? (r.rental_items || r.event_type || "Wynajem sprzętu")
                    : ([r.tent?.name, r.package?.name].filter(Boolean).join(" · ") || r.event_type || "Realizacja iClub");
                  const termin = r.business_line === "EQUIPMENT_RENTAL" && r.teardown_date && r.teardown_date !== r.event_date
                    ? `${fmtDate(r.event_date)}–${fmtDate(r.teardown_date)}` : fmtDate(r.event_date);
                  return (
                    <tr key={r.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <Link href={`/reservations/${r.id}`} className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                          <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: line.fg }} title={line.label} />
                          {r.customer?.name ?? "— bez klienta —"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-ink">{termin}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2"><span className="line-clamp-1 max-w-[280px]">{covers}</span></td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-ink">{fmtPLN(r.price)}</td>
                      <td className="px-4 py-3"><Pill label={st.label} fg={st.fg} bg={st.bg} /></td>
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
              const line = LINE_META[r.business_line] ?? { label: r.business_line, fg: "#9aa0b2", bg: "#22242e" };
              const st = realizedMeta(jobStatusByRes.get(r.id), r.status);
              const covers = r.business_line === "EQUIPMENT_RENTAL"
                ? (r.rental_items || r.event_type || "Wynajem sprzętu")
                : ([r.tent?.name, r.package?.name].filter(Boolean).join(" · ") || r.event_type || "Realizacja iClub");
              return (
                <Link key={r.id} href={`/reservations/${r.id}`} className="block rounded-card border-l-4 border border-border bg-surface p-4" style={{ borderLeftColor: line.fg }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[14.5px] font-bold text-ink">{r.customer?.name ?? "— bez klienta —"}</div>
                    <Pill label={st.label} fg={st.fg} bg={st.bg} />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Pill label={line.label} fg={line.fg} bg={line.bg} />
                    <span className="truncate text-[12.5px] font-medium text-ink-2">{covers}</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-2">
                    <span>📅 {r.business_line === "EQUIPMENT_RENTAL" && r.teardown_date && r.teardown_date !== r.event_date ? `${fmtDate(r.event_date)}–${fmtDate(r.teardown_date)}` : fmtDate(r.event_date)}</span>
                    {r.location && <span>📍 {r.location}</span>}
                    <span>💰 {fmtPLN(r.price)}</span>
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
