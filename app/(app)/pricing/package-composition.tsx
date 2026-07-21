"use client";
// §11.1 Edytor składu pakietu — jakie pozycje magazynowe i w jakiej ilości zawiera pakiet.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui";
import type { PackageItemRecord } from "@/lib/data/types";
import { savePackageItemsAction } from "./composition-actions";

type InvChoice = { id: string; name: string; unit: string | null };
type Row = { equipment_id: string; name: string; unit: string | null; quantity: number };

export function PackageComposition({
  packageId,
  packageName,
  initialItems,
  inventory,
  disabled,
}: {
  packageId: string;
  packageName: string;
  initialItems: PackageItemRecord[];
  inventory: InvChoice[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [rows, setRows] = useState<Row[]>(
    initialItems.map((it) => ({ equipment_id: it.equipment_id, name: it.equipment?.name ?? "—", unit: it.equipment?.unit ?? null, quantity: it.quantity })),
  );
  const [pick, setPick] = useState("");
  const [pickQty, setPickQty] = useState("1");

  const usedIds = new Set(rows.map((r) => r.equipment_id));
  const available = inventory.filter((i) => !usedIds.has(i.id));

  const add = () => {
    const inv = inventory.find((i) => i.id === pick);
    if (!inv) return;
    setSaved(false);
    setRows((rs) => [...rs, { equipment_id: inv.id, name: inv.name, unit: inv.unit, quantity: Math.max(1, Math.round(Number(pickQty)) || 1) }]);
    setPick("");
    setPickQty("1");
  };
  const setQty = (id: string, q: number) => { setSaved(false); setRows((rs) => rs.map((r) => (r.equipment_id === id ? { ...r, quantity: Math.max(1, Math.round(q) || 1) } : r))); };
  const remove = (id: string) => { setSaved(false); setRows((rs) => rs.filter((r) => r.equipment_id !== id)); };

  const save = () => {
    setError(null);
    start(async () => {
      const res = await savePackageItemsAction(packageId, rows.map((r) => ({ equipment_id: r.equipment_id, quantity: r.quantity })));
      if (res.ok) { setSaved(true); router.refresh(); return; }
      setError(res.error ?? "Błąd");
    });
  };

  return (
    <details className="rounded-[11px] border border-border bg-surface-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2">
        Skład pakietu „{packageName}” <span className="text-ink">· {rows.length} {rows.length === 1 ? "pozycja" : "pozycji"}</span>
      </summary>
      <div className="border-t border-border px-3.5 py-3">
        {error && <div className="mb-2"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

        {rows.length === 0 ? (
          <p className="mb-2 text-[12px] text-ink-2">Brak pozycji. Dodaj sprzęt zawarty w tym pakiecie.</p>
        ) : (
          <div className="mb-2 flex flex-col gap-1.5">
            {rows.map((r) => (
              <div key={r.equipment_id} className="flex items-center gap-2 rounded-[9px] border border-border bg-surface px-2.5 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">{r.name}</span>
                <div className="flex items-center rounded-[8px] border border-border">
                  <button type="button" onClick={() => setQty(r.equipment_id, r.quantity - 1)} disabled={disabled} className="px-2 py-0.5 text-[14px] font-bold text-ink-2">−</button>
                  <input inputMode="numeric" value={String(r.quantity)} onChange={(e) => setQty(r.equipment_id, Number(e.target.value.replace(/[^0-9]/g, "")) || 1)} disabled={disabled} className="w-9 bg-transparent text-center text-[12.5px] font-bold text-ink outline-none" aria-label={`Ilość: ${r.name}`} />
                  <button type="button" onClick={() => setQty(r.equipment_id, r.quantity + 1)} disabled={disabled} className="px-2 py-0.5 text-[14px] font-bold text-ink-2">+</button>
                </div>
                <span className="text-[11px] text-ink-2">{r.unit ?? "szt."}</span>
                <button type="button" onClick={() => remove(r.equipment_id)} disabled={disabled} className="text-[11px] font-semibold text-bad">Usuń</button>
              </div>
            ))}
          </div>
        )}

        {available.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <select value={pick} onChange={(e) => setPick(e.target.value)} disabled={disabled} className="min-w-0 flex-1 rounded-[9px] border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-brand">
              <option value="">— dodaj pozycję —</option>
              {available.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <input inputMode="numeric" value={pickQty} onChange={(e) => setPickQty(e.target.value.replace(/[^0-9]/g, ""))} disabled={disabled} className="w-14 rounded-[9px] border border-border bg-surface px-2.5 py-1.5 text-center text-[12.5px] text-ink outline-none focus:border-brand" aria-label="Ilość" />
            <button type="button" onClick={add} disabled={disabled || !pick} className="rounded-[9px] border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-accent-soft">Dodaj</button>
          </div>
        )}

        <button type="button" onClick={save} disabled={pending || disabled} className={`rounded-[10px] px-3.5 py-2 text-[12.5px] font-bold ${disabled ? "border border-border bg-surface text-ink-2" : "bg-brand text-white"}`}>
          {pending ? "Zapisywanie…" : saved ? "Zapisano ✓" : "Zapisz skład"}
        </button>
      </div>
    </details>
  );
}
