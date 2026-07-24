"use client";
// §II.17 Rozładunek / protokół po powrocie — krok po kroku z paskiem postępu:
// Rozpocznij → Sprzęt rozpakowany → Samochód posprzątany → Koszty dodane → Zakończ realizację.
// „Dodaj koszt" i „Dodaj zgłoszenie" NIE są stałe pod nagłówkiem — pojawiają się w kroku
// „Koszty dodane". Zgłoszenia trafiają tam, co zgłoszenia z demontażu (zadania serwisowe §18).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui";
import { addProtocolCostAction, addIssueAction, saveActualKmAction, type IssueType } from "./protocol-actions";

const fmtPLN = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 2 }).format(v);

const STEPS = ["Rozpocznij", "Sprzęt rozpakowany", "Samochód posprzątany", "Koszty dodane", "Zakończ realizację"];
const ISSUE_TYPES: IssueType[] = ["Uwaga", "Incydent", "Pomysł"];

function Bar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#262935]">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct >= 100 ? "#22c55e" : "linear-gradient(90deg,#8b5cf6,#e11d74)" }} />
    </div>
  );
}

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

  const [checked, setChecked] = useState<boolean[]>(STEPS.map(() => false));
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [issueType, setIssueType] = useState<IssueType>("Uwaga");
  const [issueDesc, setIssueDesc] = useState("");
  const [actualKm, setActualKm] = useState("");

  const doneCount = checked.filter(Boolean).length;
  const currentIndex = checked.findIndex((c) => !c);
  const allDone = currentIndex === -1;
  const check = (i: number) => setChecked((c) => c.map((v, j) => (j === i ? true : v)));
  const uncheck = (i: number) => setChecked((c) => c.map((v, j) => (j === i ? false : v)));

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
  const saveKm = () => run(() => saveActualKmAction(jobId, actualKm), () => setActualKm(""));

  return (
    <div className="mt-3.5 rounded-[18px] border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#271b3f] text-[#b98cf5]"><Icon name="box" className="h-4.5 w-4.5" /></span>
        <div className="flex-1">
          <div className="font-display text-[15px] font-bold text-white">Rozładunek <span className="text-[11px] font-semibold text-ink-2">· po powrocie</span></div>
          <div className="text-[11.5px] font-medium text-ink-2">{allDone ? "Rozładunek zakończony" : `Krok ${doneCount + 1} z ${STEPS.length} · ${STEPS[currentIndex]}`}</div>
        </div>
        <span className="font-display text-[15px] font-bold text-[#e9d5ff]">{Math.round((doneCount / STEPS.length) * 100)}%</span>
      </div>

      {/* §II.21 Pasek postępu rozładunku */}
      <div className="mb-3.5"><Bar value={doneCount / STEPS.length} /></div>

      {error && <div className="mb-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}
      {allDone && <div className="mb-1"><Alert tone="ok" title="Rozładunek zakończony">Sprzęt w bazie, koszty dopisane. Dziękujemy!</Alert></div>}

      <div>
        {STEPS.map((s, i) => {
          const isDone = checked[i];
          const isCurrent = i === currentIndex;
          return (
            <div key={s} className="flex gap-3">
              <div className="flex flex-none flex-col items-center">
                <span className="flex items-center justify-center rounded-full border-2 text-[13px] font-bold" style={{ height: 30, width: 30, background: isDone ? "#22c55e" : "#191b24", borderColor: isDone ? "#22c55e" : isCurrent ? "#e11d74" : "#2a2d3a", color: isDone ? "#08170d" : isCurrent ? "#f26fa6" : "#6b7180" }}>
                  {isDone ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {i < STEPS.length - 1 && <span className="my-0.5 w-0.5 flex-1" style={{ minHeight: 14, background: isDone ? "#22c55e" : "#262935" }} />}
              </div>

              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <div className="text-[14px] font-bold" style={{ color: isDone ? "#7c818f" : isCurrent ? "#ecedf2" : "#9096a8" }}>{s}</div>
                  {isDone && <button onClick={() => uncheck(i)} className="ml-auto text-[11.5px] font-semibold text-ink-2">Cofnij</button>}
                </div>

                {isCurrent && (
                  <div className="mt-2 rounded-[13px] border border-[#2a2340] bg-[#181423] p-3.5">
                    {/* Krok „Koszty dodane" — koszty, faktyczne km i zgłoszenia. */}
                    {s === "Koszty dodane" ? (
                      <>
                        <div className="mb-2 flex flex-col gap-1 rounded-[10px] bg-surface px-3 py-2.5 text-[12px]">
                          <div className="flex justify-between"><span className="text-ink-2">Trasa</span><span className="font-semibold text-ink">{summary.distanceKm != null ? `${summary.distanceKm} km` : "—"}</span></div>
                          <div className="flex justify-between"><span className="text-ink-2">Transport (paliwo + eksploatacja)</span><span className="font-semibold text-ink">{fmtPLN(summary.transportCost)}</span></div>
                          <div className="flex justify-between border-t border-border-soft pt-1"><span className="text-ink-2">Koszty dopisane</span><span className="font-bold text-ink">{fmtPLN(summary.costsTotal)}</span></div>
                        </div>

                        {/* §II.17 Faktyczny przejazd z licznika → koszt paliwa z realnych km. */}
                        <div className="mb-3 rounded-[10px] border border-border bg-surface px-3 py-2.5">
                          <div className="mb-1 text-[11.5px] font-semibold text-ink-2">Faktyczny przejazd (licznik)</div>
                          <div className="flex gap-2">
                            <input inputMode="numeric" value={actualKm} onChange={(e) => setActualKm(e.target.value)} placeholder="km" className="w-24 rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
                            <button onClick={saveKm} disabled={pending} className="flex-1 rounded-[10px] bg-[#271b3f] px-3 py-2 text-[12.5px] font-bold text-[#e0c8ff]">{pending ? "Zapisywanie…" : "Przelicz koszt paliwa"}</button>
                          </div>
                          <div className="mt-1 text-[10.5px] text-ink-2">Aktualizuje koszt paliwa z realnych km (bez osobnego kosztu).</div>
                        </div>

                        {/* Dodaj koszt */}
                        <div className="mb-3">
                          <div className="mb-1.5 text-[12.5px] font-bold text-ink">Dodaj koszt</div>
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

                        {/* Dodaj zgłoszenie (usterka/czyszczenie → zadania serwisowe) */}
                        <div className="mb-3">
                          <div className="mb-1.5 text-[12.5px] font-bold text-ink">Dodaj zgłoszenie</div>
                          <div className="mb-2 flex gap-1.5">
                            {ISSUE_TYPES.map((t) => (
                              <button key={t} onClick={() => setIssueType(t)} className={`flex-1 rounded-[9px] px-2 py-1.5 text-[12px] font-bold ${issueType === t ? "bg-brand text-white" : "border border-border bg-surface text-ink-2"}`}>{t}</button>
                            ))}
                          </div>
                          <input value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} placeholder="Opis (usterka, czyszczenie, pomysł…)" className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
                          <button onClick={addIssue} disabled={pending} className="mt-2 w-full rounded-[10px] bg-[#271b3f] py-2 text-[12.5px] font-bold text-[#e0c8ff]">{pending ? "Zapisywanie…" : "Dodaj zgłoszenie"}</button>
                          {incidents.length > 0 && (
                            <ul className="mt-2.5 flex flex-col gap-1.5">
                              {incidents.map((it) => (
                                <li key={it.id} className="flex items-center gap-2 text-[12px]">
                                  <span className={`rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold ${it.category === "Incydent" ? "bg-[#341a1d] text-[#f58585]" : it.category === "Pomysł" ? "bg-[#182238] text-[#7fa8f5]" : "bg-[#332814] text-[#ebb05a]"}`}>{it.category}</span>
                                  <span className="min-w-0 flex-1 truncate text-ink-2">{it.equipment ?? ""}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <button onClick={() => check(i)} disabled={pending} className="w-full rounded-[11px] bg-[#22c55e] py-2.5 text-[12.5px] font-bold text-[#08170d]">Koszty dodane ✓</button>
                      </>
                    ) : (
                      <>
                        <p className="mb-3 text-[12.5px] text-ink-2">
                          {s === "Rozpocznij" ? "Rozpocznij rozładunek po powrocie do bazy." : s === "Sprzęt rozpakowany" ? "Wypakuj cały sprzęt z auta i odłóż na miejsce." : s === "Samochód posprzątany" ? "Uprzątnij samochód po rozładunku." : "Potwierdź zakończenie całej realizacji."}
                        </p>
                        <button onClick={() => check(i)} className="w-full rounded-[11px] bg-[#22c55e] py-2.5 text-[12.5px] font-bold text-[#08170d]">{s} ✓</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
