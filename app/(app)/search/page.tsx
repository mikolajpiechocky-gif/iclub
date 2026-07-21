// app/(app)/search/page.tsx — Wyszukiwarka globalna (RSC). Formularz GET (?q=),
// wyniki pogrupowane: Rezerwacje / Klienci / Magazyn. Dostępna dla każdej roli.
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { Icon } from "@/components/icons";
import { EmptyState, Pill } from "@/components/ui";
import { searchEverything } from "@/lib/data/search";
import { RESERVATION_STATUS_META, EQUIPMENT_STATUS_META } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <h2 className="font-display text-[14px] font-bold text-white">{label}</h2>
      <span className="text-[12px] font-semibold text-ink-2">{count}</span>
    </div>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query.length >= 2 ? await searchEverything(query) : null;

  return (
    <div className="mx-auto max-w-[900px] px-5 py-6 md:px-8">
      <PageHeader title="Szukaj" subtitle="Rezerwacje, klienci, magazyn" />

      <form action="/search" className="mb-6 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-field border border-border bg-surface-2 px-3.5 focus-within:border-accent">
          <Icon name="search" className="h-4.5 w-4.5 flex-none text-ink-2" />
          <input
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Klient, miejscowość, sprzęt, telefon…"
            className="min-h-[46px] flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
            aria-label="Szukaj"
          />
        </div>
        <button type="submit" className="rounded-field bg-brand px-4 text-[14px] font-bold text-white">Szukaj</button>
      </form>

      {!results && <p className="text-[13px] text-ink-2">Wpisz co najmniej 2 znaki i naciśnij „Szukaj”.</p>}

      {results && results.total === 0 && (
        <EmptyState icon="search" title="Brak wyników" desc={`Nic nie znaleziono dla „${query}”.`} />
      )}

      {results && results.total > 0 && (
        <div className="flex flex-col gap-6">
          {results.reservations.length > 0 && (
            <section>
              <GroupHeader label="Rezerwacje" count={results.reservations.length} />
              <div className="overflow-hidden rounded-card border border-border bg-surface">
                {results.reservations.map((r, i) => {
                  const m = RESERVATION_STATUS_META[r.status];
                  return (
                    <Link key={r.id} href={`/reservations/${r.id}`} className={`flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2 ${i > 0 ? "border-t border-border-soft" : ""}`}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-bold text-ink">{r.customer?.name ?? r.event_type ?? "Rezerwacja"}</div>
                        <div className="truncate text-[12px] text-ink-2">{[fmtDate(r.event_date), r.location, r.event_type].filter(Boolean).join(" · ") || "—"}</div>
                      </div>
                      <Pill label={m.label} fg={m.fg} bg={m.bg} />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {results.customers.length > 0 && (
            <section>
              <GroupHeader label="Klienci" count={results.customers.length} />
              <div className="overflow-hidden rounded-card border border-border bg-surface">
                {results.customers.map((c, i) => (
                  <Link key={c.id} href={`/customers/${c.id}/edit`} className={`flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2 ${i > 0 ? "border-t border-border-soft" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold text-ink">{c.name}</div>
                      <div className="truncate text-[12px] text-ink-2">{[c.phone, c.city, c.email].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    <Icon name="chevron-right" className="h-4 w-4 flex-none text-ink-2" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.tents.length > 0 && (
            <section>
              <GroupHeader label="Namioty" count={results.tents.length} />
              <div className="overflow-hidden rounded-card border border-border bg-surface">
                {results.tents.map((t, i) => (
                  <Link key={t.id} href="/inventory" className={`flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2 ${i > 0 ? "border-t border-border-soft" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold text-ink">{t.name}</div>
                      <div className="truncate text-[12px] text-ink-2">{[t.size, t.set_color, t.code].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    <Icon name="chevron-right" className="h-4 w-4 flex-none text-ink-2" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.equipment.length > 0 && (
            <section>
              <GroupHeader label="Sprzęt" count={results.equipment.length} />
              <div className="overflow-hidden rounded-card border border-border bg-surface">
                {results.equipment.map((e, i) => {
                  const em = EQUIPMENT_STATUS_META[e.status];
                  return (
                    <Link key={e.id} href={`/inventory/${e.id}/edit`} className={`flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2 ${i > 0 ? "border-t border-border-soft" : ""}`}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-bold text-ink">{e.name}</div>
                        <div className="truncate text-[12px] text-ink-2">{[e.code, e.category, `${e.quantity} szt.`].filter(Boolean).join(" · ")}</div>
                      </div>
                      {em && <Pill label={em.label} fg={em.fg} bg={em.bg} />}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
