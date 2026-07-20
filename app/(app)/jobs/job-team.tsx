"use client";
// Zespół zlecenia: przypisania (§9) + przewidywany zarobek (§10).
// OWNER: przypisz/usuń/lider, bonus. EMPLOYEE: podejmij (bez odpinania).
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, PrimaryButton, SecondaryButton, Pill, Alert } from "@/components/ui";
import type { EarningsBreakdown } from "@/lib/domain/earnings";
import {
  assignEmployeeAction, removeAssignmentAction, toggleLeadAction, selfClaimAction, setOwnerBonusAction,
  approveAssignmentAction, rejectAssignmentAction, withdrawRequestAction,
} from "./actions";

const fmtPLN = (v: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

export interface AssignmentView {
  id: string;
  profile_id: string;
  full_name: string;
  is_lead: boolean;
  status: "REQUESTED" | "APPROVED";
  earnings: EarningsBreakdown | null;
}

export function JobTeam({
  jobId, isOwner, currentProfileId, ownerBonus, assignments, availableEmployees, unavailableIds, myEarnings, amIAssigned, amIRequested,
}: {
  jobId: string;
  isOwner: boolean;
  currentProfileId: string | null;
  ownerBonus: number;
  assignments: AssignmentView[];
  availableEmployees: { id: string; full_name: string }[];
  unavailableIds: string[];
  myEarnings: EarningsBreakdown | null;
  amIAssigned: boolean;
  amIRequested: boolean;
}) {
  const unavailable = new Set(unavailableIds);
  const approved = assignments.filter((a) => a.status === "APPROVED");
  const requests = assignments.filter((a) => a.status === "REQUESTED");
  const myRequestId = assignments.find((a) => a.profile_id === currentProfileId && a.status === "REQUESTED")?.id ?? null;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [bonus, setBonus] = useState(String(ownerBonus || ""));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else if (res.error) setError(res.error);
    });
  };

  return (
    <SectionCard title="Zespół i zarobek" className="mt-4 p-5">
      <div className="px-5 pb-5">
        {error && <div className="mb-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

        {/* Lista przypisań (zaakceptowanych) */}
        {approved.length === 0 ? (
          <p className="text-[13px] text-ink-2">Brak przypisanych pracowników.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {approved.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-[13px] border border-border bg-surface-2 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-bold text-ink">{a.full_name}</span>
                    {a.is_lead && <Pill label="Lider" fg="#e0c8ff" bg="#271b3f" />}
                  </div>
                  {a.earnings && (
                    <div className="mt-0.5 text-[12px] text-ink-2">
                      Zarobek: <span className="font-bold text-ok">{fmtPLN(a.earnings.total)}</span>
                      <span className="text-muted"> ({a.earnings.baseLabel}{a.earnings.ownerBonus ? ` + bonus ${fmtPLN(a.earnings.ownerBonus)}` : ""})</span>
                    </div>
                  )}
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <button onClick={() => run(() => toggleLeadAction(a.id, jobId, !a.is_lead))} disabled={pending} className="rounded-[9px] border border-border bg-surface px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2">{a.is_lead ? "Zdejmij lidera" : "Ustaw lidera"}</button>
                    <button onClick={() => run(() => removeAssignmentAction(a.id, jobId))} disabled={pending} className="rounded-[9px] border border-[#3a1c1f] bg-[#251215] px-2.5 py-1.5 text-[11.5px] font-semibold text-bad">Usuń</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* OWNER: prośby pracowników o przypisanie (do akceptacji) */}
        {isOwner && requests.length > 0 && (
          <div className="mt-3.5 border-t border-border-soft pt-3.5">
            <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.5px] text-warn">Prośby o przypisanie ({requests.length})</div>
            <div className="flex flex-col gap-2.5">
              {requests.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-[13px] border border-[#3d3216] bg-[#241e10] px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-ink">{a.full_name}</div>
                    {a.earnings && <div className="mt-0.5 text-[12px] text-ink-2">Zarobek: <span className="font-bold text-ok">{fmtPLN(a.earnings.total)}</span></div>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => run(() => approveAssignmentAction(a.id, jobId, a.profile_id))} disabled={pending} className="rounded-[9px] bg-ok px-3 py-1.5 text-[11.5px] font-bold text-[#08170d]">Akceptuj</button>
                    <button onClick={() => run(() => rejectAssignmentAction(a.id, jobId, a.profile_id))} disabled={pending} className="rounded-[9px] border border-[#3a1c1f] bg-[#251215] px-2.5 py-1.5 text-[11.5px] font-semibold text-bad">Odrzuć</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OWNER: przypisz pracownika */}
        {isOwner && availableEmployees.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-end gap-2.5">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="assign" className="text-[12px] font-semibold text-ink-2">Przypisz pracownika</label>
              <select id="assign" value={pick} onChange={(e) => setPick(e.target.value)} className="min-h-[44px] rounded-field border border-border bg-surface-2 px-3 text-[14px] text-ink outline-none focus:border-accent">
                <option value="">— wybierz —</option>
                {availableEmployees.map((e) => <option key={e.id} value={e.id}>{e.full_name}{unavailable.has(e.id) ? " (niedostępny w tym terminie)" : ""}</option>)}
              </select>
            </div>
            <PrimaryButton onClick={() => pick && run(() => assignEmployeeAction(jobId, pick))} disabled={pending || !pick}>Przypisz</PrimaryButton>
            {pick && unavailable.has(pick) && (
              <div className="w-full"><Alert tone="warn" title="Pracownik oznaczył niedostępność">Możesz przypisać mimo to (decyzja właściciela), ale sprawdź termin.</Alert></div>
            )}
          </div>
        )}

        {/* OWNER: bonus do zlecenia */}
        {isOwner && (
          <div className="mt-3.5 flex flex-wrap items-end gap-2.5 border-t border-border-soft pt-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bonus" className="text-[12px] font-semibold text-ink-2">Bonus właściciela do zlecenia (zł)</label>
              <input id="bonus" inputMode="numeric" value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="0" className="min-h-[44px] w-40 rounded-field border border-border bg-surface-2 px-3.5 text-[14px] text-ink outline-none focus:border-accent" />
            </div>
            <SecondaryButton onClick={() => run(() => setOwnerBonusAction(jobId, bonus))} disabled={pending}>Zapisz bonus</SecondaryButton>
          </div>
        )}

        {/* EMPLOYEE: poproś o przypisanie / status prośby */}
        {!isOwner && currentProfileId && (
          <div className="mt-3.5 border-t border-border-soft pt-3.5">
            {amIAssigned ? (
              <Alert tone="ok" title="Jesteś przypisany do tego zlecenia">
                Przypisanie jest wiążące — odpiąć może tylko właściciel.
              </Alert>
            ) : amIRequested ? (
              <div>
                <Alert tone="warn" title="Prośba wysłana">Czeka na akceptację właściciela.</Alert>
                {myRequestId && (
                  <div className="mt-2">
                    <SecondaryButton onClick={() => run(() => withdrawRequestAction(myRequestId, jobId))} disabled={pending}>Wycofaj prośbę</SecondaryButton>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-bold text-ink">Wolne zlecenie</div>
                  {myEarnings && <div className="mt-0.5 text-[12px] text-ink-2">Twój przewidywany zarobek: <span className="font-bold text-ok">{fmtPLN(myEarnings.total)}</span> <span className="text-muted">({myEarnings.baseLabel})</span></div>}
                </div>
                <PrimaryButton onClick={() => run(() => selfClaimAction(jobId))} disabled={pending}>Poproś o przypisanie</PrimaryButton>
              </div>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
