// app/(app)/inventory/page.tsx — Magazyn (RSC).
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { StatusBadge, PrimaryButton } from "@/components/ui";
import { DEMO_INVENTORY_SUMMARY, DEMO_TENTS, DEMO_GEAR } from "@/lib/demo-data";

const TENT_TINT: Record<string, string> = { "TENT-01": "#25406e", "TENT-02": "#1e4a2c", "TENT-03": "#5a4a17" };

export default function InventoryPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-6 md:px-8">
      <PageHeader title="Magazyn" subtitle="Stan na dziś · magazyn Poznań" actions={<PrimaryButton icon="plus">Dodaj sprzęt</PrimaryButton>} />

      {/* Podsumowanie */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {DEMO_INVENTORY_SUMMARY.map((s) => (
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
        {DEMO_TENTS.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-4 rounded-[14px] border border-border bg-surface px-4 py-3.5">
            <div className="h-11 w-16 flex-none rounded-lg border border-[#2a2d3a]" style={{ background: `repeating-linear-gradient(135deg,${TENT_TINT[t.id]},${TENT_TINT[t.id]} 7px,#171922 7px,#171922 14px)` }} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-ink">{t.name}</div>
              <div className="mt-0.5 text-[12px] font-medium text-ink-2">{t.code} · {t.location}</div>
            </div>
            <StatusBadge status={t.status} />
            <Link href="#" className="text-[12.5px] font-semibold">Szczegóły →</Link>
          </div>
        ))}
      </div>

      {/* Sprzęt liczony ilościowo */}
      <h2 id="gear" className="mb-3 font-display text-[15px] font-bold text-white">Sprzęt liczony ilościowo</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {DEMO_GEAR.map((g) => {
          const pA = (g.available / g.total) * 100, pR = (g.reserved / g.total) * 100, pD = (g.damaged / g.total) * 100;
          return (
            <div key={g.id} className="rounded-[14px] border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <div className="text-[13.5px] font-bold text-ink">{g.name}</div>
                <div className="font-display text-[16px] font-bold text-white">{g.total}</div>
              </div>
              <div className="my-2.5 flex h-2 overflow-hidden rounded-[5px] bg-[#23262f]">
                <div style={{ width: `${pA}%`, background: "#22c55e" }} />
                <div style={{ width: `${pR}%`, background: "#3b82f6" }} />
                <div style={{ width: `${pD}%`, background: "#ef4444" }} />
              </div>
              <div className="flex gap-3 text-[11px] font-semibold">
                <span className="text-ok">● {g.available} dost.</span>
                <span className="text-info">● {g.reserved} rez.</span>
                <span className="text-bad">● {g.damaged} usz.</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
