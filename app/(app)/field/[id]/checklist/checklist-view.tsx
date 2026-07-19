"use client";
// Checklista pakowania (mobile): odhaczanie, postęp, zakończenie mimo braków.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChecklistItem, ProgressBar, PrimaryButton, SecondaryButton, BottomSheet, Alert, TextField } from "@/components/ui";
import type { ChecklistItemRecord } from "@/lib/data/types";
import { CHECKLIST_CATEGORY_ORDER } from "@/lib/domain/checklist";
import { generateChecklistAction, toggleItemAction } from "./actions";

export function ChecklistView({ jobId, items, backHref }: { jobId: string; items: ChecklistItemRecord[]; backHref: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sheet, setSheet] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const done = items.filter((i) => i.done).length;
  const missingRequired = items.filter((i) => i.required && !i.done).length;
  const problems = items.filter((i) => i.problem).length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  const categories = [
    ...CHECKLIST_CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c)),
    ...[...new Set(items.map((i) => i.category))].filter((c) => !CHECKLIST_CATEGORY_ORDER.includes(c)),
  ];

  const toggle = (id: string, current: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await toggleItemAction(id, jobId, !current);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Błąd");
    });
  };
  const generate = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateChecklistAction(jobId);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Błąd");
    });
  };
  const finish = () => {
    if (missingRequired > 0 || done < items.length) setSheet(true);
    else router.push(backHref);
  };

  if (items.length === 0) {
    return (
      <div className="px-4">
        {error && <div className="mb-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}
        <div className="rounded-card border border-dashed border-[#2e313d] p-8 text-center">
          <div className="text-[15px] font-bold text-ink">Brak checklisty</div>
          <div className="mt-1 mb-4 text-[13px] text-ink-2">Wygeneruj checklistę pakowania z konfiguracji zlecenia (namiot, pakiet, dodatki).</div>
          <PrimaryButton onClick={generate} disabled={pending}>{pending ? "Generowanie…" : "Wygeneruj checklistę"}</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <div className="border-b border-border-soft bg-workspace px-4 py-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-[15px] font-bold text-white">Checklista pakowania</span>
          <span className="text-[13px] font-bold text-ink">{done} / {items.length}</span>
        </div>
        <ProgressBar value={pct} />
        <div className="mt-2.5 flex gap-3.5 text-[11.5px] font-semibold">
          <span className="text-ok">✓ {done} gotowe</span>
          <span className="text-warn">▲ {problems} problem</span>
          <span className="text-bad">● {items.length - done} braki</span>
        </div>
      </div>

      {error && <div className="px-4 pt-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

      <div className="px-4">
        {categories.map((cat) => {
          const group = items.filter((i) => i.category === cat);
          if (!group.length) return null;
          return (
            <div key={cat}>
              <div className="mt-4 mb-2 px-0.5 text-[11px] font-bold uppercase tracking-[0.7px] text-muted">{cat}</div>
              <div className="flex flex-col gap-2">
                {group.map((it) => (
                  <ChecklistItem key={it.id} label={it.label} meta={it.qty ?? undefined} done={it.done} required={it.required} onToggle={() => toggle(it.id, it.done)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-4 pb-4" style={{ background: "linear-gradient(#0f101600,#0f1016 30%)" }}>
        <PrimaryButton block onClick={finish} disabled={pending}>Zakończ pakowanie</PrimaryButton>
      </div>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Kończysz mimo braków">
        <div className="mb-3"><Alert tone="warn" title={`${missingRequired} pozycji obowiązkowych bez odhaczenia`}>Możesz zakończyć, ale podaj jedno końcowe wyjaśnienie.</Alert></div>
        <div className="mb-4"><TextField label="Wyjaśnienie" placeholder="Np. kotwy uzupełnimy na miejscu z zapasu w aucie" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <div className="flex gap-2.5">
          <SecondaryButton block onClick={() => setSheet(false)}>Wróć</SecondaryButton>
          <PrimaryButton block disabled={reason.trim().length < 3} onClick={() => router.push(backHref)}>Zakończ mimo braków</PrimaryButton>
        </div>
      </BottomSheet>
    </div>
  );
}
