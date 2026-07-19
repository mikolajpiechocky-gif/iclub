// app/(app)/inventory/page.tsx — Magazyn (RSC, dane z Supabase lub demo).
import { PageHeader } from "@/components/layout";
import { Pill } from "@/components/ui";
import { listTents } from "@/lib/data/resources";
import { listEquipment } from "@/lib/data/equipment";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { TentStatus, EquipmentStatus } from "@/lib/data/types";

export const dynamic = "force-dynamic";

const TENT_TINT: Record<string, string> = { Niebieski: "#25406e", Żółty: "#5a4a17", Zielony: "#1e4a2c" };

const TENT_STATUS_META: Record<TentStatus, { label: string; fg: string; bg: string }> = {
  AVAILABLE: { label: "Dostępny", fg: "#5fd68b", bg: "#16301f" },
  RESERVED: { label: "Zarezerwowany", fg: "#7fa8f5", bg: "#182238" },
  ON_SITE: { label: "Na realizacji", fg: "#b98cf5", bg: "#271b3f" },
  SERVICE: { label: "W serwisie", fg: "#ebb05a", bg: "#332814" },
  DAMAGED: { label: "Uszkodzony", fg: "#f58585", bg: "#341a1d" },
};

const EQUIP_STATUS_META: Record<EquipmentStatus, { label: string; fg: string; bg: string }> = {
  AVAILABLE: { label: "Dostępny", fg: "#5fd68b", bg: "#16301f" },
  SERVICE: { label: "W serwisie", fg: "#ebb05a", bg: "#332814" },
  DAMAGED: { label: "Uszkodzony", fg: "#f58585", bg: "#341a1d" },
};

export default async function InventoryPage() {
  const [tents, equipment] = await Promise.all([listTents(), listEquipment()]);
  const demo = !isSupabaseConfigured();

  const tentsAvailable = tents.filter((t) => t.status === "AVAILABLE").length;
  const equipUnits = equipment.reduce((sum, e) => sum + (e.quantity || 0), 0);

  const summary = [
    { label: "Namioty", value: tents.length, color: "#7fa8f5" },
    { label: "Namioty dostępne", value: tentsAvailable, color: "#5fd68b" },
    { label: "Pozycje sprzętu", value: equipment.length, color: "#b98cf5" },
    { label: "Sztuk sprzętu", value: equipUnits, color: "#ebb05a" },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader title="Magazyn" subtitle="Stan zasobów · namioty i sprzęt" />

      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — dane przykładowe. Po skonfigurowaniu Supabase magazyn pokaże prawdziwe zasoby.
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

      {/* Sprzęt */}
      <h2 id="gear" className="mb-3 font-display text-[15px] font-bold text-white">Sprzęt liczony ilościowo</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {equipment.map((e) => {
          const m = EQUIP_STATUS_META[e.status];
          return (
            <div key={e.id} className="rounded-[14px] border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13.5px] font-bold text-ink">{e.name}</div>
                  {e.category && <div className="mt-0.5 text-[11.5px] font-medium text-ink-2">{e.category}</div>}
                </div>
                <div className="font-display text-[18px] font-bold text-white">{e.quantity}</div>
              </div>
              <div className="mt-2.5"><Pill label={m.label} fg={m.fg} bg={m.bg} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
