// app/(app)/inventory/page.tsx — Magazyn (§17): pełna edycja pozycji + audyt zmian.
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { Pill, PrimaryButton } from "@/components/ui";
import { listTents } from "@/lib/data/resources";
import { listInventory, listInventoryAudit } from "@/lib/data/inventory";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { EQUIPMENT_STATUS_META, type TentStatus } from "@/lib/data/types";
import { InventoryAuditList } from "./audit-list";

export const dynamic = "force-dynamic";

const TENT_TINT: Record<string, string> = { Niebieski: "#25406e", Żółty: "#5a4a17", Zielony: "#1e4a2c" };

const TENT_STATUS_META: Record<TentStatus, { label: string; fg: string; bg: string }> = {
  AVAILABLE: { label: "Dostępny", fg: "#5fd68b", bg: "#16301f" },
  RESERVED: { label: "Zarezerwowany", fg: "#7fa8f5", bg: "#182238" },
  ON_SITE: { label: "Na realizacji", fg: "#b98cf5", bg: "#271b3f" },
  SERVICE: { label: "W serwisie", fg: "#ebb05a", bg: "#332814" },
  DAMAGED: { label: "Uszkodzony", fg: "#f58585", bg: "#341a1d" },
};

const fmtPLN = (v: number | null) =>
  v == null ? null : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

export default async function InventoryPage() {
  const [tents, items, audit] = await Promise.all([listTents(), listInventory(true), listInventoryAudit(undefined, 8)]);
  const demo = !isSupabaseConfigured();

  const active = items.filter((i) => i.active);
  const retired = items.filter((i) => !i.active);
  const tentsAvailable = tents.filter((t) => t.status === "AVAILABLE").length;
  const equipUnits = active.reduce((sum, e) => sum + (e.quantity || 0), 0);

  const summary = [
    { label: "Namioty", value: tents.length, color: "#7fa8f5" },
    { label: "Namioty dostępne", value: tentsAvailable, color: "#5fd68b" },
    { label: "Pozycje sprzętu", value: active.length, color: "#b98cf5" },
    { label: "Sztuk sprzętu", value: equipUnits, color: "#ebb05a" },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader
        title="Magazyn"
        subtitle="Stan zasobów · namioty i sprzęt"
        actions={<Link href="/inventory/new"><PrimaryButton icon="plus">Dodaj pozycję</PrimaryButton></Link>}
      />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Po skonfigurowaniu Supabase magazyn pokaże i zapisze prawdziwe zasoby.
        </div>
      )}

      {/* Podsumowanie */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-[14px] border border-border bg-surface px-3.5 py-3.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="text-[11.5px] font-semibold text-ink-2">{s.label}</span>
            </div>
            <div className="mt-1.5 font-display text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Namioty */}
      <h2 className="mb-3 font-display text-[15px] font-bold text-white">Namioty</h2>
      <div className="mb-6 flex flex-col gap-2.5">
        {tents.map((t) => {
          const m = TENT_STATUS_META[t.status];
          const tint = (t.set_color && TENT_TINT[t.set_color]) || "#2a2d3a";
          return (
            <div key={t.id} className="flex flex-wrap items-center gap-4 rounded-[14px] border border-border bg-surface px-4 py-3.5">
              <div className="h-11 w-16 flex-none rounded-lg border border-[#2a2d3a]" style={{ background: `repeating-linear-gradient(135deg,${tint},${tint} 7px,#171922 7px,#171922 14px)` }} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold text-ink">{t.name}</div>
                <div className="mt-0.5 text-[12px] font-medium text-ink-2">
                  {t.code}{t.size ? ` · ${t.size}` : ""}{t.has_back_door ? " · drzwi z tyłu" : ""}
                </div>
              </div>
              <Pill label={m.label} fg={m.fg} bg={m.bg} />
            </div>
          );
        })}
      </div>

      {/* Sprzęt — edytowalny */}
      <h2 id="gear" className="mb-3 font-display text-[15px] font-bold text-white">Sprzęt i wyposażenie</h2>
      {active.length === 0 ? (
        <p className="mb-6 rounded-card border border-border bg-surface px-4 py-4 text-[13px] text-ink-2">Brak pozycji. Dodaj pierwszą przyciskiem „Dodaj pozycję”.</p>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((e) => {
            const m = EQUIPMENT_STATUS_META[e.status];
            return (
              <Link key={e.id} href={`/inventory/${e.id}/edit`} className="rounded-[14px] border border-border bg-surface p-4 transition hover:border-accent">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {e.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.photo_url} alt="" className="h-10 w-10 flex-none rounded-[9px] border border-border object-cover" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-bold text-ink">{e.name}</div>
                      <div className="mt-0.5 text-[11.5px] font-medium text-ink-2">
                        {[e.category, e.location].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[18px] font-bold text-white">{e.quantity}{e.unit ? <span className="ml-0.5 text-[11px] text-ink-2">{e.unit}</span> : null}</div>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <Pill label={m.label} fg={m.fg} bg={m.bg} />
                  {e.is_addon && <span className="rounded-[7px] bg-[#271b3f] px-1.5 py-0.5 text-[10px] font-bold text-[#c9b6f2]">Dodatek{e.rental_price != null ? ` · ${fmtPLN(e.rental_price)}` : ""}</span>}
                  {e.internal_only && <span className="rounded-[7px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-2">Wewnętrzne</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {retired.length > 0 && (
        <>
          <h2 className="mb-3 font-display text-[14px] font-bold text-ink-2">Wycofane ({retired.length})</h2>
          <div className="mb-6 flex flex-col gap-2">
            {retired.map((e) => (
              <Link key={e.id} href={`/inventory/${e.id}/edit`} className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-2.5 opacity-60 transition hover:opacity-100">
                <span className="text-[13px] font-semibold text-ink line-through">{e.name}</span>
                <span className="ml-auto text-[11.5px] text-ink-2">przywróć →</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* §17.3 Ostatnie zmiany magazynowe (audyt) */}
      <InventoryAuditList entries={audit} title="Ostatnie zmiany w magazynie" />
    </div>
  );
}
