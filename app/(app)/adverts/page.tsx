// app/(app)/adverts/page.tsx — Ogłoszenia OLX (RSC, tylko OWNER): reakcja na
// wygaśnięcia + analiza wyników (wyświetlenia, telefony, skuteczność) z zaleceniami.
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { MetricCard, Alert, Pill } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listOlxAdverts } from "@/lib/data/olx-adverts";
import { getOlxIntegration } from "@/lib/data/olx";
import { analyzeFleet } from "@/lib/domain/olx-adverts";
import { AdvertsSyncButton } from "./sync-button";

export const dynamic = "force-dynamic";

const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "short" }) : "—";
const delta = (d: number | null) => (d == null || d === 0 ? "" : d > 0 ? ` (+${d})` : ` (${d})`);

function expiryPill(days: number | null, expired: boolean) {
  if (expired) return <Pill label="Wygasło" fg="#f58585" bg="#341a1d" />;
  if (days != null && days <= 3) return <Pill label={`Wygasa za ${days} dni`} fg="#ebb05a" bg="#332814" />;
  if (days != null) return <Pill label={`${days} dni`} fg="#7fa8f5" bg="#182238" />;
  return <Pill label="—" fg="#9aa0b2" bg="#22242e" />;
}

export default async function AdvertsPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Ogłoszenia OLX" subtitle="Dostępne dla właściciela" />
        <Alert tone="info" title="Brak dostępu">Statystyki ogłoszeń widzi tylko właściciel.</Alert>
      </div>
    );
  }

  const [adverts, integration] = await Promise.all([listOlxAdverts(), getOlxIntegration()]);
  const connected = Boolean(integration?.refresh_token);
  const { insights, summary } = analyzeFleet(adverts);
  const toReact = insights.filter((i) => i.expired || i.expiringSoon);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6 md:px-8">
      <PageHeader
        title="Ogłoszenia OLX"
        subtitle="Monitoring, wygaśnięcia i analiza wyników"
        actions={connected ? <AdvertsSyncButton /> : undefined}
      />

      {!connected && (
        <Alert tone="warn" title="OLX niepołączone">
          Najpierw połącz konto OLX w <Link href="/settings" className="font-bold underline">Ustawieniach</Link>, potem wróć i kliknij „Synchronizuj ogłoszenia”.
        </Alert>
      )}

      {connected && adverts.length === 0 && (
        <Alert tone="info" title="Brak danych">Kliknij „Synchronizuj ogłoszenia”, aby pobrać listę i statystyki z OLX.</Alert>
      )}

      {adverts.length > 0 && (
        <>
          {/* Wnioski (podsumowanie floty) */}
          <div className="mb-5 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <MetricCard label="Ogłoszenia" value={String(summary.count)} />
            <MetricCard label="Wyświetlenia" value={summary.totalViews.toLocaleString("pl-PL")} tone="ok" />
            <MetricCard label="Telefony" value={summary.totalPhones.toLocaleString("pl-PL")} tone="ok" />
            <MetricCard label="Skuteczność" value={pct(summary.avgConversion)} sub="telefony / wyświetlenia" />
          </div>

          {/* Do reakcji */}
          <h2 className="mb-3 font-display text-[15px] font-bold text-white">Do reakcji {toReact.length > 0 && <span className="text-warn">({toReact.length})</span>}</h2>
          {toReact.length === 0 ? (
            <div className="mb-6 rounded-card border border-border bg-surface px-4 py-4 text-[13px] text-ink-2">Żadne ogłoszenie nie wygasa w najbliższych dniach. 👍</div>
          ) : (
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {toReact.map((i) => (
                <div key={i.advert.olx_id} className="rounded-card-lg border border-[#3d3216] bg-[#241e10] p-4">
                  <div className="mb-1 flex items-start gap-2">
                    <div className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{i.advert.title ?? "Ogłoszenie"}</div>
                    {expiryPill(i.daysToExpiry, i.expired)}
                  </div>
                  <div className="mb-2 text-[12px] text-ink-2">👁 {i.advert.views.toLocaleString("pl-PL")}{delta(i.deltaViews)} · 📞 {i.advert.phones.toLocaleString("pl-PL")}{delta(i.deltaPhones)} · skuteczność {pct(i.conversion)}</div>
                  <p className="text-[12.5px] font-semibold text-warn">{i.recommendations[0]}</p>
                  {i.advert.url && <a href={i.advert.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[12.5px] font-bold text-white underline">Otwórz w OLX →</a>}
                </div>
              ))}
            </div>
          )}

          {/* Analiza — wszystkie ogłoszenia */}
          <h2 className="mb-3 font-display text-[15px] font-bold text-white">Analiza wyników</h2>
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-[#12131a] text-[11px] font-bold uppercase tracking-[0.5px] text-muted">
                <tr>{["Ogłoszenie", "Wyświetlenia", "Telefony", "Skuteczność", "Wygasa", "Zalecenia"].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {insights.map((i) => (
                  <tr key={i.advert.olx_id} className="border-b border-border-soft align-top last:border-0">
                    <td className="px-4 py-3">
                      <div className="max-w-[240px] truncate text-[13px] font-bold text-ink">{i.advert.title ?? "Ogłoszenie"}</div>
                      {i.advert.url && <a href={i.advert.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-ink-2 underline">otwórz →</a>}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-ink">{i.advert.views.toLocaleString("pl-PL")}<span className="text-[11px] text-ink-2">{delta(i.deltaViews)}</span></td>
                    <td className="px-4 py-3 text-[13px] text-ink">{i.advert.phones.toLocaleString("pl-PL")}<span className="text-[11px] text-ink-2">{delta(i.deltaPhones)}</span></td>
                    <td className="px-4 py-3 text-[13px] font-bold" style={{ color: i.conversion == null ? "#9aa0b2" : i.conversion >= 0.05 ? "#5fd68b" : i.conversion < 0.02 ? "#f58585" : "#e9edf5" }}>{pct(i.conversion)}</td>
                    <td className="px-4 py-3">{expiryPill(i.daysToExpiry, i.expired)}</td>
                    <td className="px-4 py-3">
                      <ul className="list-disc space-y-0.5 pl-4 text-[12px] text-ink-2">
                        {i.recommendations.map((r, k) => <li key={k}>{r}</li>)}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11.5px] text-ink-2">Skuteczność = odsłony numeru / wyświetlenia. Progi zaleceń są heurystyczne — dostroimy po zebraniu danych z kilku synchronizacji.</p>
        </>
      )}
    </div>
  );
}
