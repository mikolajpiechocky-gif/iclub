// app/(app)/inquiries/page.tsx — Lista zapytań (RSC, dane z Supabase lub demo).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { PrimaryButton, EmptyState, Pill } from "@/components/ui";
import { listInquiries } from "@/lib/data/inquiries";
import { getCurrentProfile } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { INQUIRY_STATUS_META, INQUIRY_STATUS_LABELS, INQUIRY_SOURCE_LABELS, inquiryDisplayName, type InquiryStatus } from "@/lib/data/types";
import { AutoCloseButton } from "./lead-buttons";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";

// §B3 Czy lead OLX mieści się w oknie 30 dni. Pure — „teraz" jako parametr (spójnie z lib/domain),
// żeby nie wołać Date.now() w renderze. Dla źródeł innych niż OLX zawsze true.
const THIRTY_MS = 30 * 24 * 60 * 60 * 1000;
function isRecentOlx(q: { source: string | null; last_activity_at: string | null; created_at: string }, now = Date.now()): boolean {
  if (q.source !== "OLX") return true;
  const t = q.last_activity_at ?? q.created_at;
  return t ? now - new Date(t).getTime() <= THIRTY_MS : true;
}

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string; signal?: string; all?: string }> }) {
  const [all, profile, sp] = await Promise.all([listInquiries(), getCurrentProfile(), searchParams]);
  const demo = !isSupabaseConfigured();
  const isOwner = profile?.role === "OWNER";

  // §4.2 Filtr statusu z kafelka pulpitu (np. ?status=NEW). §6 Filtr „padły dane do umowy".
  const activeStatus = sp.status && sp.status in INQUIRY_STATUS_LABELS ? (sp.status as InquiryStatus) : null;
  const signalOnly = sp.signal === "1";
  const signalCount = all.filter((q) => q.contract_signal).length;

  // §B3 Domyślnie wiadomości OLX z ostatnich 30 dni; starsze do filtrowania („Pokaż wszystkie").
  // last_activity_at leada OLX = czas ostatniej wiadomości (ustawiany przy synchronizacji).
  const showAllTime = sp.all === "1";
  const hiddenOlder = all.filter((q) => q.source === "OLX" && !isRecentOlx(q)).length;

  const inquiries = all.filter((q) =>
    (activeStatus ? q.status === activeStatus : true) &&
    (signalOnly ? q.contract_signal : true) &&
    (showAllTime || isRecentOlx(q))
  );

  // Zachowanie pozostałych filtrów w linku przełącznika okna czasu.
  const baseParams = new URLSearchParams();
  if (activeStatus) baseParams.set("status", activeStatus);
  if (signalOnly) baseParams.set("signal", "1");
  const withAll = new URLSearchParams(baseParams); withAll.set("all", "1");
  const allHref = `/inquiries?${withAll.toString()}`;
  const recentHref = baseParams.toString() ? `/inquiries?${baseParams.toString()}` : "/inquiries";

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Zapytania"
        subtitle={`${inquiries.length} ${inquiries.length === 1 ? "zapytanie" : "zapytań"}${activeStatus ? ` · ${INQUIRY_STATUS_LABELS[activeStatus]}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isOwner && <AutoCloseButton />}
            <Link href="/inquiries/new">
              <PrimaryButton icon="plus">Nowe zapytanie</PrimaryButton>
            </Link>
          </div>
        }
      />

      {(activeStatus || signalOnly) && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-border bg-surface-2 px-4 py-2.5 text-[12.5px]">
          <span className="font-semibold text-ink">{signalOnly ? "Wygląda na domknięte" : `Status: ${INQUIRY_STATUS_LABELS[activeStatus!]}`}</span>
          <Link href="/inquiries" className="ml-auto font-semibold text-accent-soft">Wyczyść ✕</Link>
        </div>
      )}

      {!signalOnly && !activeStatus && signalCount > 0 && (
        <div className="mb-4">
          <Link href="/inquiries?signal=1" className="inline-flex items-center gap-2 rounded-card border border-[#1e4a2c] bg-[#16301f] px-4 py-2.5 text-[12.5px] font-semibold text-ok">
            {signalCount} {signalCount === 1 ? "lead wygląda na domknięty" : "leadów wygląda na domknięte"} → pokaż
          </Link>
        </div>
      )}

      {/* §B3 Okno czasu wiadomości OLX: domyślnie 30 dni, starsze do filtrowania */}
      {(showAllTime || hiddenOlder > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface-2 px-4 py-2.5 text-[12.5px]">
          <span className="font-semibold text-ink">
            {showAllTime ? "Wszystkie wiadomości OLX" : "Wiadomości OLX z ostatnich 30 dni"}
          </span>
          {!showAllTime && <span className="text-ink-2">· {hiddenOlder} starszych ukrytych</span>}
          <Link href={showAllTime ? recentHref : allHref} className="ml-auto font-semibold text-accent-soft">
            {showAllTime ? "Tylko 30 dni" : "Pokaż wszystkie →"}
          </Link>
        </div>
      )}

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Po skonfigurowaniu Supabase lista pokaże prawdziwe zapytania.
        </div>
      )}

      {inquiries.length === 0 ? (
        <EmptyState
          title="Brak zapytań"
          desc="Dodaj pierwsze zapytanie, aby zacząć prowadzić sprzedaż."
          action={
            <Link href="/inquiries/new">
              <PrimaryButton icon="plus">Nowe zapytanie</PrimaryButton>
            </Link>
          }
        />
      ) : (
        <>
          {/* DESKTOP: tabela */}
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface md:block">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-[#12131a] text-[11px] font-bold uppercase tracking-[0.5px] text-muted">
                <tr>
                  {["Klient", "Rodzaj", "Data", "Lokalizacja", "Osoby", "Źródło", "Status", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inquiries.map((q) => {
                  const m = INQUIRY_STATUS_META[q.status];
                  return (
                    <tr key={q.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3"><Link href={`/inquiries/${q.id}/edit`} className="text-[13.5px] font-bold text-ink">{inquiryDisplayName(q)}</Link>{q.contract_signal && <span className="ml-2 rounded-[6px] bg-[#16301f] px-1.5 py-0.5 text-[10px] font-bold text-ok">domknięte</span>}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{q.event_type || "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink">{fmtDate(q.event_date)}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{q.location || "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink">{q.guests ?? "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-2">{q.source ? INQUIRY_SOURCE_LABELS[q.source] : "—"}</td>
                      <td className="px-4 py-3"><Pill label={m.label} fg={m.fg} bg={m.bg} /></td>
                      <td className="px-4 py-3 text-right"><Link href={`/inquiries/${q.id}/edit`} className="text-[12.5px] font-semibold">Edytuj →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE: karty */}
          <div className="flex flex-col gap-3 md:hidden">
            {inquiries.map((q) => {
              const m = INQUIRY_STATUS_META[q.status];
              return (
                <Link key={q.id} href={`/inquiries/${q.id}/edit`} className="rounded-card border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[14.5px] font-bold text-ink">{inquiryDisplayName(q)}{q.contract_signal && <span className="ml-2 rounded-[6px] bg-[#16301f] px-1.5 py-0.5 text-[10px] font-bold text-ok align-middle">domknięte</span>}</div>
                    <Pill label={m.label} fg={m.fg} bg={m.bg} />
                  </div>
                  <div className="mt-1 text-[12.5px] font-medium text-ink-2">{[q.event_type, q.tent_interest, q.package_interest].filter(Boolean).join(" · ") || "—"}</div>
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-2">
                    <span>📅 {fmtDate(q.event_date)}</span>
                    {q.location && <span>📍 {q.location}</span>}
                    {q.guests != null && <span>👥 {q.guests} os.</span>}
                    {q.source && <span>🔗 {INQUIRY_SOURCE_LABELS[q.source]}</span>}
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
