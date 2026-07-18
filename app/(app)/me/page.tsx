"use client";
// app/(app)/me/page.tsx — Dashboard pracownika (MOBILE-first).
// Client component: przełączanie stanu synchronizacji (demo).
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { SyncBadge, SyncStatusCard } from "@/components/ui";
import { CURRENT_EMPLOYEE } from "@/lib/demo-data";
import type { SyncState } from "@/lib/types";

const TAKE_GEAR = [
  { name: "Namiot 6×8 Blue", qty: "1 szt.", done: true },
  { name: "Kolumny aktywne", qty: "2 szt.", done: true },
  { name: "Głowice LED", qty: "4 szt.", done: false },
  { name: "Wytwornica dymu", qty: "1 szt.", done: false },
];
const SYNC_CYCLE: SyncState[] = ["synced", "pending", "syncing", "offline", "error"];

export default function EmployeeDashboardPage() {
  const [sync, setSync] = useState<SyncState>("pending");
  const cycle = () => setSync((s) => SYNC_CYCLE[(SYNC_CYCLE.indexOf(s) + 1) % SYNC_CYCLE.length]);

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[13px] text-[17px] font-bold text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#e11d74)" }}>{CURRENT_EMPLOYEE.initials}</span>
          <div>
            <div className="font-display text-[18px] font-bold text-white">Cześć, {CURRENT_EMPLOYEE.name}</div>
            <div className="text-[12.5px] font-medium text-ink-2">Sobota, 18 lipca · 2 zadania</div>
          </div>
        </div>
        <SyncBadge state={sync} count={3} onClick={cycle} />
      </div>

      {/* Najbliższa realizacja */}
      <div className="mb-4 rounded-[20px] border border-[#33253f] p-4.5 text-white" style={{ background: "linear-gradient(150deg,#2a1533,#191b24)", padding: 18 }}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-[#b9becf]">Najbliższa realizacja</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white"><span className="h-1.5 w-1.5 rounded-full bg-[#7fa8f5]" />Zaplanowane</span>
        </div>
        <div className="font-display text-[19px] font-bold">Osiemnastka — Julia N.</div>
        <div className="mt-1 text-[13px] font-medium text-[#c9cddb]">Tarnowo Podgórne, ul. Poznańska 14</div>
        <div className="mt-3.5 flex gap-2.5">
          {[["WYJAZD", "12:30"], ["ZESPÓŁ", "2 os."], ["POJAZD", "Iveco"]].map(([k, v]) => (
            <div key={k} className="flex-1 rounded-xl bg-white/[0.07] px-3 py-2.5">
              <div className="text-[10px] font-semibold text-[#9aa0b2]">{k}</div>
              <div className="mt-0.5 font-display text-[15px] font-bold">{v}</div>
            </div>
          ))}
        </div>
        <Link href="/field/1042" className="bg-brand mt-3 flex min-h-[44px] w-full items-center justify-center rounded-[13px] text-[14px] font-bold text-white">Otwórz realizację</Link>
      </div>

      {/* Sprzęt do zabrania */}
      <div className="mb-3.5 rounded-card border border-border bg-surface px-4 py-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-display text-[14px] font-bold text-white">Sprzęt do zabrania</span>
          <span className="text-[11.5px] font-bold text-ok">2 / 4</span>
        </div>
        {TAKE_GEAR.map((g) => (
          <div key={g.name} className="flex items-center gap-2.5 py-1.5">
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md text-[12px] font-bold" style={{ background: g.done ? "#16301f" : "#23262f", color: g.done ? "#5fd68b" : "#8a90a0" }}>{g.done ? <Icon name="check" className="h-3 w-3" /> : ""}</span>
            <span className="flex-1 text-[13px] font-semibold" style={{ color: g.done ? "#7c818f" : "#ecedf2" }}>{g.name}</span>
            <span className="text-[12px] font-semibold text-ink-2">{g.qty}</span>
          </div>
        ))}
      </div>

      <SyncStatusCard state={sync} onClick={cycle} />
    </div>
  );
}
