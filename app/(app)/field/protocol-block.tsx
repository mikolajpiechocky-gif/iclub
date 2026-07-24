"use client";
// Blok 3: Rozładunek / protokół po realizacji (§II.5).
// Przebieg: Rozpocznij → Sprzęt rozpakowany → Samochód posprzątany → Koszty dodane → Zakończ.
// Dodaj koszt (nazwa/kwota/komentarz) i Dodaj zgłoszenie (Uwaga/Incydent/Pomysł).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui";
import { addProtocolCostAction, addIssueAction, type IssueType } from "./protocol-actions";

const fmtPLN = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 2 }).format(v);

const STEPS = ["Rozpocznij", "Sprzęt rozpakowany", "Samochód posprzątany", "Koszty dodane", "Zakończ realizację"];
const ISSUE_TYPES: IssueType[] = ["Uwaga", "Incydent", "Pomysł"];

export interface ProtocolCost { id: string; category: string; amount: number; note: string | null; status: string }
export interface ProtocolIncident { id: string; category: string; equipment: string | null; priority: string; status: string }

export function ProtocolBlock({
  jobId,
  costs,
  incidents,
  summary,
}: {
  jobId: string;
  costs: ProtocolCost[];
  incidents: ProtocolIncident[];
  summary: { distanceKm: number | null; transportCost: number | null; costsTotal: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [steps, setSteps] = useState<boolean[]>(STEPS.map(() => false));
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [issueType, setIssueType] = useState<IssueType>("Uwaga");
  const [issueDesc, setIssueDesc] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) { after?.(); router.refresh(); }
      else setError(res.error ?? "Błąd");
    });
  };
  const addCost = () => run(() => addProtocolCostAction(jobId, name, amount, comment), () => { setName(""); setAmount(""); setComment(""); });
  const addIssue = () => run(() => addIssueAction(jobId, issueType, issueDesc), () => setIssueDesc(""));

  return (
    <div className="mt-3.5 rounded-[18px] border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#271b3f] text-[#b98cf5]"><Icon name="box" className="h-4.5 w-4.5" /></span>
        <div className="flex-1">
          <div className="font-display text-[15px] font-bold text-white">Rozładunek <span className="text-[11px] font-semibold text-ink-2">· po powrocie</span></div>
          <div className="text-[11.5px] font-medium text-ink-2">Rozpakowanie, koszty i zgłoszenia</div>
        </div>
      </div>

      {error && <div className="mb-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

      {/* Przebieg rozładunku */}
      <div className="mb-4 flex flex-col gap-1.5">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setSteps((c) => c.map((v, j) => (j === i ? !v : v)))} className="flex items-center gap-2.5 rounded-[10px] border border-border bg-surface-2 px-2.5 py-2 text-left">
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border-2" style={{ background: steps[i] ? "#22c55e" : "transparent", borderColor: steps[i] ? "#22c55e" : "#3a3d4a" }}>
              {steps[i] && <Icon name="check" className="h-3 w-3 text-[#08170d]" />}
            </span>
            <span className={`text-[12.5px] font-semibold ${steps[i] ? "text-ink-2 line-through" : "text-ink"}`}>{s}</span>
          </button>
        ))}
      </div>

      {/* Dodaj koszt */}
      <div className="mb-4 rounded-[13px] border border-[#2a2340] bg-[#181423] p-3.5">
        <div className="mb-2 text-[12.5px] font-bold text-ink">Dodaj koszt</div>
        <div className="mb-2 flex flex-col gap-1 rounded-[10px] bg-surface px-3 py-2.5 text-[12px]">
          <div className="flex justify-between"><span className="text-ink-2">Trasa</span><span className="font-semibold text-ink">{summary.distanceKm != null ? `${summary.distanceKm} km` : "—"}</span></div>
          <div className="flex justify-between"><span className="text-ink-2">Transport (paliwo + eksploatacja)</span><span className="font-semibold text-ink">{fmtPLN(summary.transportCost)}</span></div>
          <div className="flex justify-between border-t border-border-soft pt-1"><span className="text-ink-2">Koszty dopisane</span><span className="font-bold text-ink">{fmtPLN(summary.costsTotal)}</span></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nazwa (paliwo, autostrada…)" className="min-w-[140px] flex-1 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Kwota zł" className="w-24 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
        </div>
        <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Komentarz (opcjonalnie)" className="mt-2 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
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

      {/* Dodaj zgłoszenie */}
      <div className="rounded-[13px] border border-[#2a2340] bg-[#181423] p-3.5">
        <div className="mb-2 text-[12.5px] font-bold text-ink">Dodaj zgłoszenie</div>
        <div className="mb-2 flex gap-1.5">
          {ISSUE_TYPES.map((t) => (
            <button key={t} onClick={() => setIssueType(t)} className={`flex-1 rounded-[9px] px-2 py-1.5 text-[12px] font-bold ${issueType === t ? "bg-brand text-white" : "border border-border bg-surface text-ink-2"}`}>{t}</button>
          ))}
        </div>
        <input value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} placeholder="Opis…" className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
        <button onClick={addIssue} disabled={pending} className="mt-2 w-full rounded-[10px] bg-[#271b3f] py-2 text-[12.5px] font-bold text-[#e0c8ff]">{pending ? "Zapisywanie…" : "Dodaj zgłoszenie"}</button>
        {incidents.length > 0 && (
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {incidents.map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-[12px]">
                <span className={`rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold ${i.category === "Incydent" ? "bg-[#341a1d] text-[#f58585]" : i.category === "Pomysł" ? "bg-[#182238] text-[#7fa8f5]" : "bg-[#332814] text-[#ebb05a]"}`}>{i.category}</span>
                <span className="min-w-0 flex-1 truncate text-ink-2">{i.equipment ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
