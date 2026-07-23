"use client";
// Blok 3: Rozpakowanie i protokół po realizacji — podsumowanie kosztów (system + dopisywanie)
// oraz oznaczanie sprzętu do czyszczenia/naprawy (tworzy zgłoszenie dla szefa).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui";
import { addProtocolCostAction, markEquipmentAction } from "./protocol-actions";

const fmtPLN = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 2 }).format(v);

export interface ProtocolCost { id: string; category: string; amount: number; note: string | null; status: string }
export interface ProtocolIncident { id: string; category: string; equipment: string | null; priority: string; status: string }

export function ProtocolBlock({
  jobId,
  equipmentSuggestions,
  costs,
  incidents,
  summary,
}: {
  jobId: string;
  equipmentSuggestions: string[];
  costs: ProtocolCost[];
  incidents: ProtocolIncident[];
  summary: { distanceKm: number | null; transportCost: number | null; costsTotal: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [equip, setEquip] = useState("");
  const [cat, setCat] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) { after?.(); router.refresh(); }
      else setError(res.error ?? "Błąd");
    });
  };

  const mark = (kind: "CLEAN" | "REPAIR") => {
    if (!equip.trim()) { setError("Wpisz, jaki sprzęt."); return; }
    run(() => markEquipmentAction(jobId, equip, kind), () => setEquip(""));
  };
  const addCost = () => run(() => addProtocolCostAction(jobId, cat, amount, note), () => { setCat(""); setAmount(""); setNote(""); });

  return (
    <div className="mt-3.5 rounded-[18px] border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#271b3f] text-[#b98cf5]"><Icon name="clipboard" className="h-4.5 w-4.5" /></span>
        <div className="flex-1">
          <div className="font-display text-[15px] font-bold text-white">Rozpakowanie i protokół <span className="text-[11px] font-semibold text-ink-2">· po realizacji</span></div>
          <div className="text-[11.5px] font-medium text-ink-2">Koszty i sprzęt do czyszczenia/naprawy</div>
        </div>
      </div>

      {error && <div className="mb-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

      {/* Sprzęt do czyszczenia / naprawy */}
      <div className="mb-4 rounded-[13px] border border-[#2a2340] bg-[#181423] p-3.5">
        <div className="mb-2 text-[12.5px] font-bold text-ink">Sprzęt do czyszczenia / naprawy</div>
        <input
          list="protocol-equip"
          value={equip}
          onChange={(e) => setEquip(e.target.value)}
          placeholder="np. Namiot 6×8, wytwornica dymu…"
          className="mb-2 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
        />
        <datalist id="protocol-equip">
          {equipmentSuggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
        <div className="flex gap-2">
          <button onClick={() => mark("CLEAN")} disabled={pending} className="flex-1 rounded-[10px] border border-[#3d3216] bg-[#241e10] py-2 text-[12.5px] font-bold text-warn">Do czyszczenia</button>
          <button onClick={() => mark("REPAIR")} disabled={pending} className="flex-1 rounded-[10px] border border-[#3a1c1f] bg-[#251215] py-2 text-[12.5px] font-bold text-bad">Do naprawy</button>
        </div>
        {incidents.length > 0 && (
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {incidents.map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-[12px]">
                <span className={`rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold ${i.category === "Naprawa" ? "bg-[#341a1d] text-[#f58585]" : "bg-[#332814] text-[#ebb05a]"}`}>{i.category}</span>
                <span className="min-w-0 flex-1 truncate text-ink-2">{i.equipment ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Podsumowanie kosztów */}
      <div className="rounded-[13px] border border-[#2a2340] bg-[#181423] p-3.5">
        <div className="mb-2 text-[12.5px] font-bold text-ink">Podsumowanie kosztów</div>
        <div className="mb-3 flex flex-col gap-1 rounded-[10px] bg-surface px-3 py-2.5 text-[12px]">
          <div className="flex justify-between"><span className="text-ink-2">Trasa</span><span className="font-semibold text-ink">{summary.distanceKm != null ? `${summary.distanceKm} km` : "—"}</span></div>
          <div className="flex justify-between"><span className="text-ink-2">Transport (paliwo + eksploatacja)</span><span className="font-semibold text-ink">{fmtPLN(summary.transportCost)}</span></div>
          <div className="flex justify-between border-t border-border-soft pt-1"><span className="text-ink-2">Koszty dopisane</span><span className="font-bold text-ink">{fmtPLN(summary.costsTotal)}</span></div>
        </div>

        <div className="flex flex-wrap gap-2">
          <input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Kategoria (paliwo, autostrada…)" className="min-w-[140px] flex-1 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Kwota zł" className="w-24 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notatka (opcjonalnie)" className="mt-2 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
        <button onClick={addCost} disabled={pending} className="mt-2 w-full rounded-[10px] bg-[#271b3f] py-2 text-[12.5px] font-bold text-[#e0c8ff]">{pending ? "Zapisywanie…" : "Dodaj koszt"}</button>

        {costs.length > 0 && (
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {costs.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-[12px]">
                <span className="min-w-0 flex-1 truncate text-ink-2">{c.category}{c.note ? ` · ${c.note}` : ""}</span>
                <span className="font-semibold text-ink">{fmtPLN(c.amount)}</span>
                {c.status === "VERIFIED" && <span className="text-[10px] font-bold text-ok">✓</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
