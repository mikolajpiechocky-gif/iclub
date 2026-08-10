"use client";
// =====================================================================
// Panel pracownika — przebieg realizacji terenowej (§19).
// Zamiast jednej listy „do odhaczenia” każdy etap to osobny blok z własnymi
// czynnościami: W drodze (nawigacja), Montaż, Szkolenie klienta (punkty),
// Zdjęcia (miejsca na zdjęcia), Rozliczenie (płatność + podpis), Demontaż.
// Pakowanie jest osobnym blokiem powyżej (dzień przed).
// =====================================================================
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { JobStageRecord, PaymentMethod } from "@/lib/data/types";
import { PAYMENT_METHOD_LABELS } from "@/lib/data/types";
import type { SettlementBreakdown } from "@/lib/domain/billing";
import { REALIZATIONS_BUCKET } from "@/lib/config/storage";
import { advanceStageAction, reportFieldPaymentAction, saveDepositDeductionAction } from "./actions";
import { createJobPhotoAction } from "./photo-actions";
import { reportEquipmentStatusAction, addIssueAction, saveActualKmAction, type EqStatus, type IssueType } from "./protocol-actions";

const fmtPLN = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);
// §N1 Kwoty wynagrodzenia z groszami (np. 259,20 zł) — spójnie z ekranem /me.
const fmtPLN2 = (v: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);

// §II.21 Pasek postępu — używany dla całej realizacji, dla kroku na osi i w panelach.
function ProgressBar({ value, tone = "accent", className = "", height = 6 }: { value: number; tone?: "accent" | "ok"; className?: string; height?: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const bg = tone === "ok" ? "#22c55e" : "#b98cf5";
  return (
    <div className={`w-full overflow-hidden rounded-full bg-[#262935] ${className}`} style={{ height }}>
      <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%`, background: tone === "ok" ? bg : "linear-gradient(90deg,#8b5cf6,#e11d74)" }} />
    </div>
  );
}

// Wiersz „etykieta — wartość" w rozbiciu rozliczenia (§II.2).
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-1 flex items-center justify-between first:mt-0"><span className="truncate pr-2 text-ink-2">{label}</span><span className="flex-none font-semibold text-ink">{value}</span></div>
  );
}

// Etykieta z postępem kroku panelu (np. „Montaż · 3/5").
function StepProgressHeader({ label, done, total }: { label: string; done: number; total: number }) {
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-center justify-between text-[11.5px] font-semibold">
        <span className="text-ink-2">{label}</span>
        <span className={done >= total && total > 0 ? "text-ok" : "text-ink-2"}>{done}/{total}</span>
      </div>
      <ProgressBar value={total > 0 ? done / total : 0} tone={done >= total && total > 0 ? "ok" : "accent"} />
    </div>
  );
}

/* --------------------------- Blok: Pakowanie -------------------------- */
export function PackingBlock({
  jobId,
  stage,
  checklistHref,
  progress,
}: {
  jobId: string;
  stage: JobStageRecord | null;
  checklistHref: string;
  progress: { done: number; total: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const done = stage?.status === "DONE";

  const mark = (status: "DONE" | "TODO") => {
    if (!stage) return;
    setError(null);
    startTransition(async () => {
      const res = await advanceStageAction(stage.id, jobId, status);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <div className="mb-3.5 rounded-[16px] border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${done ? "bg-[#16301f] text-[#5fd68b]" : "bg-[#271b3f] text-[#b98cf5]"}`}>
          <Icon name={done ? "check" : "clipboard"} className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-ink">Pakowanie <span className="text-[11px] font-semibold text-ink-2">· dzień przed</span></div>
          <div className="text-[11.5px] font-medium text-ink-2">
            {progress.total > 0 ? `Spakowane ${progress.done}/${progress.total}` : "Sprzęt do zabrania — odhacz przed wyjazdem"}
          </div>
        </div>
        {progress.total > 0 && <span className="font-display text-[13px] font-bold text-[#b98cf5]">{Math.round((progress.done / progress.total) * 100)}%</span>}
      </div>

      {/* §II.21 Pasek postępu pakowania */}
      {progress.total > 0 && <div className="mt-2.5"><ProgressBar value={progress.done / progress.total} tone={done ? "ok" : "accent"} /></div>}

      {error && <div className="mt-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}

      <div className="mt-3 flex gap-2.5">
        <Link href={checklistHref} className="flex-1 rounded-[11px] border border-border bg-surface-2 py-2.5 text-center text-[12.5px] font-bold text-ink">Otwórz checklistę</Link>
        {stage && (done ? (
          <button onClick={() => mark("TODO")} disabled={pending} className="rounded-[11px] border border-border bg-surface-2 px-3.5 py-2.5 text-[12.5px] font-semibold text-ink-2">Cofnij</button>
        ) : (
          <button onClick={() => mark("DONE")} disabled={pending} className="rounded-[11px] bg-[#22c55e] px-3.5 py-2.5 text-[12.5px] font-bold text-[#08170d]">Spakowane ✓</button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------ Blok: Realizacja --------------------------- */
export interface RealizationContext {
  reservationId: string; // §II.16 do zapisu potrącenia z kaucji
  navUrl: string | null;
  toPay: number | null;
  billing: SettlementBreakdown | null; // §II.2 rozbicie rozliczenia (pakiet/dodatki/transport/zadatek)
  hasSignature: boolean;
  paymentReported: boolean;
  signatureHref: string;
  photos: { id: string; url: string }[];
  canUpload: boolean;
  teardownItems: string[]; // §II.8 sprzęt do kontroli przy demontażu (z checklisty)
  hasVehicle: boolean;     // §II.14 pojazd przypisany (wymagany, by rozpocząć)
  roundTripKm: number | null; // §II.19 trasa tam i z powrotem (do podsumowania pracy)
  earnings: { baseLabel: string; total: number } | null; // §II.19 wynagrodzenie za realizację (forma + łącznie)
}

// §II.19 Czas pracy = sekcja montażu (przyjazd → koniec rozliczenia) + demontaż
// (koniec wynajmu → sprzęt w bazie). Pomija przerwę „wynajem trwa". Zwraca ms.
function workMsFromSteps(steps: JobStageRecord[]): number {
  const at = (key: string): number | null => {
    const s = steps.find((x) => x.stage_key === key)?.done_at;
    return s ? new Date(s).getTime() : null;
  };
  const seg = (a: string, b: string): number => {
    const x = at(a), y = at(b);
    return x != null && y != null && y > x ? y - x : 0;
  };
  // Wypożyczalnia — odbiór własny: przygotowanie + (po okresie wynajmu) zwrot/czyszczenie/kontrola.
  if (steps.some((s) => s.stage_key.startsWith("R_"))) return seg("R_START", "R_READY") + seg("R_RETURN", "R_CHECK");
  // Wypożyczalnia — transport: zadanie dostawy + zadanie odbioru (bez okresu wynajmu pomiędzy).
  if (steps.some((s) => s.stage_key.startsWith("D_"))) return seg("D_START", "D_DONE") + seg("P_START", "P_CLEAN_PUT");
  // iClub: montaż (przyjazd→rozliczenie) + demontaż (koniec wynajmu→sprzęt w bazie).
  return seg("TRAVEL", "SETTLEMENT") + seg("RENTAL", "TEARDOWN");
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return "—";
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

// §II.15 Checklisty montażu i szkolenia klienta — treść z wytycznych.
const MONTAZ_POINTS = [
  "Rozstaw namiot",
  "Zakotwienie",
  "Test nagłośnienia",
  "Test oświetlenia",
  "Wytwornica uzupełniona płynem",
];
const TRAINING_POINTS = [
  "Zakaz palenia",
  "Nie wyłączać dmuchawy (kaucja przepada)",
  "Zachowanie przy silnym wietrze",
  "Jeżeli namiot zacznie tracić ciśnienie — najpierw bezpiecznie wyprowadzamy wszystkich, a dopiero potem szukamy przyczyny",
];

export function RealizationFlow({ jobId, steps, ctx }: { jobId: string; steps: JobStageRecord[]; ctx: RealizationContext }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // §II.21 Żywy postęp bieżącego kroku (zgłaszany przez panel). Trzymamy indeks kroku,
  // żeby zignorować nieaktualny odczyt po przejściu dalej.
  const [curProg, setCurProg] = useState<{ step: number; frac: number }>({ step: -1, frac: 0 });

  const doneCount = steps.filter((s) => s.status === "DONE").length;
  const currentIndex = steps.findIndex((s) => s.status !== "DONE");
  // Bez kroków (np. zaimportowana realizacja bez etapów) NIE jest „zakończona".
  const allDone = steps.length > 0 && currentIndex === -1;

  const curFrac = curProg.step === currentIndex ? curProg.frac : 0;
  // Całościowy postęp: ukończone kroki + ułamek bieżącego (płynnie rośnie w trakcie pracy).
  const overall = steps.length > 0 ? (doneCount + (currentIndex >= 0 ? curFrac : 0)) / steps.length : 0;

  const stepFill = (i: number, isDone: boolean) => (isDone ? 1 : i === currentIndex ? curFrac : 0);

  const setStatus = (stageId: string, status: "DONE" | "TODO", reason?: string) => {
    setError(null);
    startTransition(async () => {
      const res = await advanceStageAction(stageId, jobId, status, reason);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <div className="rounded-[18px] border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#271b3f] text-[#b98cf5]"><Icon name="truck" className="h-4.5 w-4.5" /></span>
        <div className="flex-1">
          <div className="font-display text-[15px] font-bold text-white">Realizacja</div>
          <div className="text-[11.5px] font-medium text-ink-2">{steps.length === 0 ? "Brak kroków — zapisz rezerwację, aby wygenerować" : allDone ? "Wszystkie kroki gotowe" : `Krok ${doneCount + 1} z ${steps.length} · ${steps[currentIndex]?.title ?? ""}`}</div>
        </div>
        <span className="font-display text-[15px] font-bold text-[#e9d5ff]">{Math.round(overall * 100)}%</span>
      </div>

      {/* §II.21 Pasek postępu całej realizacji */}
      {steps.length > 0 && <div className="mb-3.5"><ProgressBar value={overall} tone={allDone ? "ok" : "accent"} height={8} /></div>}

      {error && <div className="mb-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}
      {allDone && (
        <div className="mb-1">
          <Alert tone="ok" title="Realizacja zakończona">Wszystkie kroki odhaczone. Dziękujemy!</Alert>
          {/* §II.19 Podsumowanie pracy po demontażu: czas na miejscu + przejechane km */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-[11px] border border-border bg-surface px-3 py-2.5">
              <div className="text-[11px] font-semibold text-ink-2">Czas pracy</div>
              <div className="mt-0.5 font-display text-[15px] font-bold text-ink">{fmtDuration(workMsFromSteps(steps))}</div>
              <div className="text-[10.5px] text-ink-2">montaż + demontaż</div>
            </div>
            <div className="rounded-[11px] border border-border bg-surface px-3 py-2.5">
              <div className="text-[11px] font-semibold text-ink-2">Przejechano</div>
              <div className="mt-0.5 font-display text-[15px] font-bold text-ink">{ctx.roundTripKm != null ? `${Math.round(ctx.roundTripKm)} km` : "—"}</div>
              <div className="text-[10.5px] text-ink-2">tam i z powrotem</div>
            </div>
          </div>

          {/* §II.19 Wynagrodzenie za realizację: forma (z premiami) + łącznie */}
          {ctx.earnings && (
            <div className="mt-2 rounded-[11px] border border-[#1d3a28] bg-[#12271b] px-3 py-2.5 text-[12px]">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 text-ok/80">{ctx.earnings.baseLabel}</span>
                <span className="flex-none font-display text-[15px] font-bold text-ok">{fmtPLN2(ctx.earnings.total)}</span>
              </div>
              <div className="mt-0.5 text-[10.5px] text-ok/60">Twoje wynagrodzenie za tę realizację</div>
            </div>
          )}
        </div>
      )}

      <div>
        {steps.map((s, i) => {
          const isDone = s.status === "DONE";
          const isCurrent = i === currentIndex;
          const fill = stepFill(i, isDone);
          // §wypożyczalnia Nagłówek zadania (Dostawa/Odbiór), gdy się zmienia — rozdziela dwa zadania.
          const task = RENTAL_STEP_INFO[s.stage_key]?.task;
          const prevTask = i > 0 ? RENTAL_STEP_INFO[steps[i - 1].stage_key]?.task : undefined;
          return (
            <div key={s.id}>
            {task && task !== prevTask && (
              <div className="mb-1.5 mt-1 flex items-center gap-2">
                <span className="rounded-full bg-[#271b3f] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.5px] text-[#e9d5ff]">Zadanie · {task}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className="flex gap-3">
              {/* Oś kroków */}
              <div className="flex flex-none flex-col items-center">
                <span
                  className="flex items-center justify-center rounded-full border-2 text-[13px] font-bold"
                  style={{ height: 30, width: 30, background: isDone ? "#22c55e" : "#191b24", borderColor: isDone ? "#22c55e" : isCurrent ? "#e11d74" : "#2a2d3a", color: isDone ? "#08170d" : isCurrent ? "#f26fa6" : "#6b7180" }}
                >
                  {isDone ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {i < steps.length - 1 && <span className="my-0.5 w-0.5 flex-1" style={{ minHeight: 14, background: isDone ? "#22c55e" : "#262935" }} />}
              </div>

              {/* Treść kroku */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <div className="text-[14px] font-bold" style={{ color: isDone ? "#7c818f" : isCurrent ? "#ecedf2" : "#9096a8" }}>{s.title}</div>
                  {isDone && (
                    <button onClick={() => setStatus(s.id, "TODO")} disabled={pending} className="ml-auto text-[11.5px] font-semibold text-ink-2">Cofnij</button>
                  )}
                </div>

                {/* §II.21 Pasek postępu kroku na osi — tylko dla kroków NIE-bieżących
                    (bieżący krok ma własny, szczegółowy pasek w panelu, bez dublowania). */}
                {!isCurrent && <div className="mt-1.5"><ProgressBar value={fill} tone={isDone ? "ok" : "accent"} height={4} /></div>}

                {isCurrent && (
                  <div className="mt-2 rounded-[13px] border border-[#2a2340] bg-[#181423] p-3.5">
                    <StepPanel jobId={jobId} stageKey={s.stage_key} ctx={ctx} pending={pending} onDone={(reason) => setStatus(s.id, "DONE", reason)} onProgress={(frac) => setCurProg({ step: i, frac })} />
                  </div>
                )}
              </div>
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// §wypożyczalnia Kroki realizacji wypożyczalni (odbiór własny R_*, transport D_*/P_*).
// task = etykieta zadania (Dostawa/Odbiór) do rozdzielenia dwóch zadań w jednej realizacji.
const RENTAL_STEP_INFO: Record<string, { desc: string; issues?: boolean; transport?: boolean; task?: string }> = {
  // Odbiór własny — jedno zadanie
  R_START: { desc: "Rozpocznij realizację wypożyczenia." },
  R_CLEAN_PRE: { desc: "Sprawdź czystość sprzętu przed wydaniem klientowi." },
  R_READY: { desc: "Sprzęt przygotowany i gotowy do wydania." },
  R_RETURN: { desc: "Klient zwrócił sprzęt." },
  R_CLEAN_POST: { desc: "Wyczyść sprzęt po zwrocie." },
  R_CHECK: { desc: "Sprawdź stan sprzętu po wynajmie — zgłoś ewentualne usterki.", issues: true },
  // Transport — zadanie 1: dostawa
  D_START: { desc: "Rozpocznij dostawę do klienta.", task: "Dostawa" },
  D_CLEAN_PRE: { desc: "Sprawdź czystość sprzętu przed wydaniem.", task: "Dostawa" },
  D_TRANSPORT: { desc: "Dostarcz sprzęt do klienta.", transport: true, task: "Dostawa" },
  D_DONE: { desc: "Dostawa zakończona — sprzęt u klienta.", task: "Dostawa" },
  // Transport — zadanie 2: odbiór
  P_START: { desc: "Rozpocznij odbiór sprzętu od klienta.", task: "Odbiór" },
  P_CHECK: { desc: "Sprawdź stan sprzętu po wynajmie — zgłoś ewentualne usterki.", issues: true, task: "Odbiór" },
  P_CLEAN_PUT: { desc: "Wyczyść sprzęt i odłóż na miejsce w magazynie.", task: "Odbiór" },
};

// Panel pojedynczego kroku wypożyczalni: opis + (transport: nawigacja) + (kontrola: zgłoszenia) + gotowe.
function RentalStepPanel({ jobId, stageKey, ctx, pending, onDone }: { jobId: string; stageKey: string; ctx: RealizationContext; pending: boolean; onDone: () => void }) {
  const info = RENTAL_STEP_INFO[stageKey];
  const [busy, startBusy] = useTransition();
  const [type, setType] = useState<IssueType>("Incydent");
  const [desc, setDesc] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [km, setKm] = useState("");
  const [kmSaved, setKmSaved] = useState(false);
  const TYPES: IssueType[] = ["Uwaga", "Incydent", "Pomysł"];
  const saveKm = () => { setError(null); startBusy(async () => { const r = await saveActualKmAction(jobId, km); if (r.ok) { setKmSaved(true); } else setError(r.error ?? "Błąd"); }); };
  const add = () => {
    if (!desc.trim()) { setError("Opisz usterkę lub uwagę."); return; }
    setError(null);
    startBusy(async () => { const r = await addIssueAction(jobId, type, desc); if (r.ok) { setDesc(""); setSaved(true); } else setError(r.error ?? "Błąd"); });
  };
  return (
    <div>
      <p className="mb-3 text-[12.5px] text-ink-2">{info.desc}</p>
      {info.transport && (
        <div className="mb-3">
          {!ctx.hasVehicle && <div className="mb-2"><Alert tone="warn" title="Przypisz pojazd">Bez pojazdu nie policzymy paliwa z faktycznych km.</Alert></div>}
          {ctx.navUrl && <a href={ctx.navUrl} target="_blank" rel="noopener noreferrer" className="mb-2 block rounded-[11px] border border-border bg-surface-2 py-2.5 text-center text-[12.5px] font-bold text-ink">Nawiguj do klienta</a>}
          {/* Faktyczny przejazd z licznika → koszt paliwa z realnych km. */}
          <div className="rounded-[10px] border border-border bg-surface px-3 py-2.5">
            <div className="mb-1 text-[11.5px] font-semibold text-ink-2">Faktyczny przejazd (licznik)</div>
            <div className="flex gap-2">
              <input inputMode="numeric" value={km} onChange={(e) => { setKm(e.target.value); setKmSaved(false); }} placeholder="km" className="w-24 rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
              <button onClick={saveKm} disabled={busy} className="flex-1 rounded-[10px] bg-[#271b3f] px-3 py-2 text-[12.5px] font-bold text-[#e0c8ff]">{busy ? "Zapisywanie…" : "Przelicz koszt paliwa"}</button>
            </div>
            {kmSaved && <div className="mt-1 text-[11px] font-semibold text-ok">✓ Koszt paliwa przeliczony.</div>}
          </div>
        </div>
      )}
      {info.issues && (
        <div className="mb-3 rounded-[11px] border border-border bg-surface px-3 py-2.5">
          <div className="mb-2 text-[12px] font-bold text-ink">Zgłoś usterkę / uwagę</div>
          <div className="mb-2 flex gap-1.5">
            {TYPES.map((t) => <button key={t} onClick={() => setType(t)} className={`flex-1 rounded-[9px] px-2 py-1.5 text-[12px] font-bold ${type === t ? "bg-brand text-white" : "border border-border bg-surface-2 text-ink-2"}`}>{t}</button>)}
          </div>
          <input value={desc} onChange={(e) => { setDesc(e.target.value); setSaved(false); }} placeholder="Opis (uszkodzenie, brak, zabrudzenie…)" className="w-full rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
          {error && <div className="mt-2"><Alert tone="bad" title="Błąd">{error}</Alert></div>}
          {saved && <div className="mt-2 text-[11.5px] font-semibold text-ok">✓ Zgłoszenie zapisane — Szef zostanie powiadomiony.</div>}
          <button onClick={add} disabled={busy} className="mt-2 w-full rounded-[10px] bg-[#271b3f] py-2 text-[12.5px] font-bold text-[#e0c8ff]">{busy ? "Zapisywanie…" : "Dodaj zgłoszenie"}</button>
        </div>
      )}
      <DoneButton pending={pending} onClick={onDone} label="Krok gotowy" block />
    </div>
  );
}

/* ------------------- Panel czynności dla danego kroku ---------------- */
function StepPanel({ jobId, stageKey, ctx, pending, onDone, onProgress }: { jobId: string; stageKey: string; ctx: RealizationContext; pending: boolean; onDone: (reason?: string) => void; onProgress: (frac: number) => void }) {
  if (RENTAL_STEP_INFO[stageKey]) return <RentalStepPanel jobId={jobId} stageKey={stageKey} ctx={ctx} pending={pending} onDone={onDone} />;
  switch (stageKey) {
    case "TRAVEL":
      return (
        <div>
          <p className="mb-3 text-[12.5px] text-ink-2">Jedź na miejsce imprezy i potwierdź przyjazd.</p>
          {!ctx.hasVehicle && <div className="mb-2.5"><Alert tone="warn" title="Przypisz pojazd">Bez przypisanego pojazdu nie można rozpocząć realizacji (paliwo liczone z faktycznych km).</Alert></div>}
          <div className="flex gap-2.5">
            {ctx.navUrl ? (
              <a href={ctx.navUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-[11px] border border-border bg-surface-2 py-2.5 text-center text-[12.5px] font-bold text-ink">Nawiguj</a>
            ) : (
              <span className="flex-1 rounded-[11px] border border-border bg-surface-2 py-2.5 text-center text-[12.5px] font-bold text-ink-2/50">Brak adresu</span>
            )}
            <DoneButton pending={pending || !ctx.hasVehicle} onClick={onDone} label="Jestem na miejscu" />
          </div>
        </div>
      );

    case "SETUP":
      return <CheckPanel points={MONTAZ_POINTS} title="Montaż" doneLabel="Montaż gotowy" pending={pending} onDone={onDone} onProgress={onProgress} />;

    case "TRAINING":
      return <CheckPanel points={TRAINING_POINTS} title="Szkolenie klienta" doneLabel="Szkolenie przeprowadzone" pending={pending} onDone={onDone} onProgress={onProgress} />;

    case "PHOTOS":
      return <PhotosPanel jobId={jobId} ctx={ctx} pending={pending} onDone={onDone} onProgress={onProgress} />;

    case "SETTLEMENT":
      return <SettlementPanel jobId={jobId} ctx={ctx} pending={pending} onDone={onDone} onProgress={onProgress} />;

    case "RENTAL":
      return <RentalPanel jobId={jobId} pending={pending} onDone={onDone} />;

    case "TEARDOWN":
      return <TeardownPanel jobId={jobId} reservationId={ctx.reservationId} items={ctx.teardownItems} canUpload={ctx.canUpload} pending={pending} onDone={onDone} onProgress={onProgress} />;

    default:
      return <DoneButton pending={pending} onClick={onDone} label="Gotowe" block />;
  }
}

// §II.15 „Wynajem trwa": namiot rozstawiony, impreza w toku. Pracownik może zgłosić
// incydent (awaria / uszkodzenie / problem z klientem) — trafia do zgłoszeń serwisowych.
function RentalPanel({ jobId, pending, onDone }: { jobId: string; pending: boolean; onDone: () => void }) {
  const [busy, startBusy] = useTransition();
  const [type, setType] = useState<IssueType>("Incydent");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const TYPES: IssueType[] = ["Uwaga", "Incydent", "Pomysł"];

  const add = () => {
    if (!desc.trim()) { setError("Opisz zgłoszenie."); return; }
    setError(null);
    startBusy(async () => {
      const res = await addIssueAction(jobId, type, desc);
      if (res.ok) { setDesc(""); setSaved(true); }
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <div>
      <div className="mb-3 rounded-[11px] border border-[#2a2340] bg-[#1a1526] px-3 py-3 text-center">
        <div className="text-[13px] font-bold text-[#e9d5ff]">Namiot rozstawiony — wynajem trwa</div>
        <div className="mt-1 text-[11.5px] text-ink-2">Kaucja 1 000 zł pobrana. Wróć na demontaż po zakończeniu imprezy.</div>
      </div>

      {/* §II.15 Zgłoszenie w trakcie wynajmu (awaria, uszkodzenie, problem z klientem) */}
      <div className="mb-3 rounded-[11px] border border-border bg-surface px-3 py-2.5">
        <div className="mb-2 text-[12px] font-bold text-ink">Zgłoś w trakcie wynajmu</div>
        <div className="mb-2 flex gap-1.5">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} className={`flex-1 rounded-[9px] px-2 py-1.5 text-[12px] font-bold ${type === t ? "bg-brand text-white" : "border border-border bg-surface-2 text-ink-2"}`}>{t}</button>
          ))}
        </div>
        <input value={desc} onChange={(e) => { setDesc(e.target.value); setSaved(false); }} placeholder="Opis (awaria, uszkodzenie, problem z klientem…)" className="w-full rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
        {error && <div className="mt-2"><Alert tone="bad" title="Błąd">{error}</Alert></div>}
        {saved && <div className="mt-2 text-[11.5px] font-semibold text-ok">✓ Zgłoszenie zapisane — Szef zostanie powiadomiony.</div>}
        <button onClick={add} disabled={busy} className="mt-2 w-full rounded-[10px] bg-[#271b3f] py-2 text-[12.5px] font-bold text-[#e0c8ff]">{busy ? "Zapisywanie…" : "Dodaj zgłoszenie"}</button>
      </div>

      <DoneButton pending={pending} onClick={onDone} label="Impreza zakończona — demontaż" block />
    </div>
  );
}

// §II.8 Demontaż: kontrola sprzętu po tej samej checkliście. Dla każdej pozycji: OK
// (nic nie klikasz) / Czyszczenie / Uszkodzony / Brak → zgłoszenie serwisowe.
// §B2 Szkoda (Uszkodzony / Brak) wymaga OPISU + ZDJĘCIA — bez tego nie zakończysz demontażu.
const isDamage = (s: string | undefined): boolean => s === "Uszkodzony" || s === "Brak";

function TeardownPanel({ jobId, reservationId, items, canUpload, pending, onDone, onProgress }: { jobId: string; reservationId: string; items: string[]; canUpload: boolean; pending: boolean; onDone: () => void; onProgress: (frac: number) => void }) {
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Klucz po INDEKSIE pozycji (etykiety mogą się powtarzać między kategoriami → inaczej
  // dwa wiersze o tej samej nazwie dzieliłyby status i dawały duplikat klucza React).
  const [reported, setReported] = useState<Record<number, string>>({});
  const [sent, setSent] = useState<Set<number>>(new Set());        // indeksy z utworzonym zgłoszeniem
  const [desc, setDesc] = useState<Record<number, string>>({});     // opis szkody per pozycja
  const [photoCount, setPhotoCount] = useState<Record<number, number>>({}); // liczba zdjęć szkody per pozycja
  const [uploading, setUploading] = useState<number | null>(null);
  const [deduction, setDeduction] = useState(""); // §II.16 potrącenie z kaucji za uszkodzenia
  const deducted = Number(deduction.replace(",", ".")) || 0;

  // Pozycja „domknięta": OK (bez zgłoszenia) albo status z zapisanym zgłoszeniem (Czyszczenie/szkoda).
  const isComplete = (idx: number): boolean => {
    const st = reported[idx];
    if (!st) return false;
    return st === "OK" || sent.has(idx);
  };
  const completed = items.filter((_, idx) => isComplete(idx)).length;
  const allComplete = items.length === 0 || completed === items.length;

  const applyStatus = (idx: number, status: string) => {
    setReported((r) => ({ ...r, [idx]: status }));
  };

  // §pasek: postęp = domknięte pozycje (a nie tylko zaznaczone) — bo szkoda bez zdjęcia nie liczy się.
  const bumpProgress = (idxOverrideComplete?: number) => {
    const done = items.filter((_, idx) => (idx === idxOverrideComplete ? true : isComplete(idx))).length;
    onProgress(items.length ? done / items.length : 0);
  };

  // „OK" — potwierdza sprawdzenie, bez zgłoszenia. Czyszczenie — od razu tworzy zgłoszenie serwisowe.
  // Uszkodzony / Brak — otwiera formularz szkody (opis + zdjęcie), zgłoszenie dopiero po „Zapisz szkodę".
  const pick = (idx: number, item: string, status: EqStatus | "OK") => {
    if (reported[idx] === status) return;
    // Zmiana statusu resetuje wcześniejsze zapisanie zgłoszenia dla tej pozycji.
    setSent((s) => { const n = new Set(s); n.delete(idx); return n; });
    applyStatus(idx, status);
    if (status === "OK") { setTimeout(() => bumpProgress(idx), 0); return; }
    if (status === "Czyszczenie") {
      setError(null);
      startBusy(async () => {
        const res = await reportEquipmentStatusAction(jobId, item, "Czyszczenie", "");
        if (res.ok) { setSent((s) => new Set(s).add(idx)); bumpProgress(idx); }
        else setError(res.error ?? "Błąd");
      });
    }
    // Uszkodzony/Brak: nic nie tworzymy — czekamy na opis + zdjęcie.
  };

  const pickPhoto = async (idx: number, item: string, status: string, file: File | null) => {
    if (!file) return;
    setError(null);
    if (!canUpload) { setPhotoCount((p) => ({ ...p, [idx]: (p[idx] ?? 0) + 1 })); return; } // demo: bez zapisu
    setUploading(idx);
    const supabase = createClient();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${jobId}/szkoda-${idx}-${crypto.randomUUID()}.${ext}`;
    let uploaded = false;
    try {
      const { error: upErr } = await supabase.storage.from(REALIZATIONS_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw new Error(upErr.message);
      uploaded = true;
      const res = await createJobPhotoAction(jobId, path, `Szkoda: ${item} — ${status}`);
      if (!res.ok) throw new Error(res.error ?? "Nie udało się zapisać.");
      uploaded = false;
      setPhotoCount((p) => ({ ...p, [idx]: (p[idx] ?? 0) + 1 }));
    } catch (e) {
      if (uploaded) await supabase.storage.from(REALIZATIONS_BUCKET).remove([path]).catch(() => {});
      setError(e instanceof Error ? e.message : "Nie udało się wysłać zdjęcia.");
    } finally {
      setUploading(null);
    }
  };

  const saveDamage = (idx: number, item: string, status: EqStatus) => {
    const d = (desc[idx] ?? "").trim();
    if (d.length < 3) { setError("Opisz szkodę (min. 3 znaki)."); return; }
    if ((photoCount[idx] ?? 0) < 1) { setError("Dodaj przynajmniej jedno zdjęcie szkody."); return; }
    if (sent.has(idx)) return;
    setError(null);
    startBusy(async () => {
      const res = await reportEquipmentStatusAction(jobId, item, status, d);
      if (res.ok) { setSent((s) => new Set(s).add(idx)); bumpProgress(idx); router.refresh(); }
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <div>
      {items.length > 0 && <StepProgressHeader label="Sprawdzony sprzęt" done={completed} total={items.length} />}
      <p className="mb-3 text-[12.5px] text-ink-2">Zdemontuj i sprawdź każdy element. Potwierdź „OK”, a problem zaznacz — przy uszkodzeniu dołącz opis i zdjęcie.</p>
      {error && <div className="mb-2"><Alert tone="bad" title="Błąd">{error}</Alert></div>}
      {items.length > 0 ? (
        <div className="mb-3 flex flex-col gap-1.5">
          {items.map((it, idx) => {
            const st = reported[idx];
            const ok = st === "OK";
            const damage = isDamage(st);
            const saved = sent.has(idx);
            const nPhotos = photoCount[idx] ?? 0;
            return (
              <div key={`${idx}-${it}`} className={`rounded-[10px] border px-2.5 py-2 ${ok ? "border-[#1d3a28] bg-[#12271b]" : st ? "border-[#3d3216] bg-[#241e10]" : "border-border bg-surface"}`}>
                <div className="mb-1.5 text-[12.5px] font-semibold text-ink">{it}{st && <span className={`ml-1.5 text-[11px] font-bold ${ok ? "text-ok" : "text-warn"}`}>· {st}</span>}{damage && saved && <span className="ml-1.5 text-[11px] font-bold text-ok">✓ zapisano</span>}</div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => pick(idx, it, "OK")} className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-bold ${ok ? "border-ok bg-[#16301f] text-ok" : "border-border bg-surface-2 text-ink-2"}`}>OK</button>
                  {(["Czyszczenie", "Uszkodzony", "Brak"] as EqStatus[]).map((s) => (
                    <button key={s} onClick={() => pick(idx, it, s)} disabled={busy} className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-bold ${st === s ? "border-warn bg-[#332814] text-warn" : "border-border bg-surface-2 text-ink-2"}`}>{s}</button>
                  ))}
                </div>

                {/* §B2 Szkoda — wymagany opis + zdjęcie, inaczej nie domkniemy demontażu. */}
                {damage && (
                  <div className="mt-2 rounded-[9px] border border-[#3d3216] bg-[#1c1710] p-2.5">
                    <textarea value={desc[idx] ?? ""} onChange={(e) => setDesc((d) => ({ ...d, [idx]: e.target.value }))} disabled={saved} rows={2} placeholder="Opis szkody (co, gdzie, zakres)…" className="w-full resize-none rounded-[8px] border border-border bg-surface-2 px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-accent disabled:opacity-70" />
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {!saved && (
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-border bg-surface-2 px-2.5 py-1.5 text-[11px] font-bold text-ink-2">
                          <Icon name={uploading === idx ? "refresh" : "camera"} className={`h-3.5 w-3.5 ${uploading === idx ? "animate-spin" : ""}`} />
                          {uploading === idx ? "Wysyłanie…" : nPhotos > 0 ? "Dodaj kolejne" : "Dodaj zdjęcie"}
                          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading === idx} onChange={(e) => pickPhoto(idx, it, st ?? "", e.target.files?.[0] ?? null)} />
                        </label>
                      )}
                      {nPhotos > 0 && <span className="text-[11px] font-bold text-ok">📷 {nPhotos} {nPhotos === 1 ? "zdjęcie" : "zdjęcia"}</span>}
                      {!saved && <button onClick={() => saveDamage(idx, it, st as EqStatus)} disabled={busy} className="ml-auto rounded-[8px] bg-[#271b3f] px-3 py-1.5 text-[11px] font-bold text-[#e0c8ff]">Zapisz szkodę</button>}
                    </div>
                    {!saved && <div className="mt-1 text-[10.5px] text-warn">Wymagane: opis + min. 1 zdjęcie.</div>}
                    {!canUpload && <div className="mt-0.5 text-[10px] text-ink-2/70">Tryb demo — zdjęcia liczone bez zapisu.</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mb-3 text-[12px] text-ink-2">Brak checklisty sprzętowej — wygeneruj checklistę pakowania, aby mieć listę do kontroli.</p>
      )}

      {/* §II.16 Zwrot kaucji — domyślnie pełny, można wpisać potrącenie za uszkodzenia. */}
      <div className="mb-3 rounded-[10px] border border-border bg-surface px-3 py-2.5">
        <div className="mb-1.5 text-[12px] font-bold text-ink">Zwrot kaucji</div>
        <div className="flex items-center justify-between text-[12px]"><span className="text-ink-2">Kaucja</span><span className="font-semibold text-ink">1 000 zł</span></div>
        <label className="mt-1.5 block text-[11px] text-ink-2">Potrącenie za uszkodzenia (zł)
          <input inputMode="decimal" value={deduction} onChange={(e) => setDeduction(e.target.value)} placeholder="0" className="mt-0.5 w-full rounded-[9px] border border-border bg-surface-2 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent" />
        </label>
        <div className="mt-1.5 flex items-center justify-between text-[12px] font-bold"><span className="text-ink">Do zwrotu klientowi</span><span className="text-ok">{fmtPLN(Math.max(0, 1000 - deducted))}</span></div>
      </div>

      {!allComplete && items.length > 0 && (
        <div className="mb-2 text-[11.5px] font-semibold text-warn">Domknij każdą pozycję — przy uszkodzeniu wymagany opis i zdjęcie ({completed}/{items.length}).</div>
      )}
      <DoneButton pending={pending || busy || !allComplete} onClick={finish} label="Zakończone — sprzęt w bazie" block />
    </div>
  );

  function finish() {
    if (!allComplete) return;
    // §II.16 Zapisz potrącenie z kaucji (przychód realizacji) i zakończ demontaż.
    if (deducted > 0 && reservationId) startBusy(async () => { await saveDepositDeductionAction(reservationId, jobId, deducted); onDone(); });
    else onDone();
  }
}

function DoneButton({ pending, onClick, label, block }: { pending: boolean; onClick: () => void; label: string; block?: boolean }) {
  return (
    // §fix onClick BEZ przekazywania eventu — inaczej SyntheticEvent leciał jako `reason` do server
    // action (React 19 nie serializuje eventu) i przejście do kolejnego kroku po cichu się wywalało.
    <button onClick={() => onClick()} disabled={pending} className={`rounded-[11px] bg-[#22c55e] py-2.5 text-[12.5px] font-bold text-[#08170d] ${block ? "w-full" : "flex-1 px-3.5"}`}>
      {label} ✓
    </button>
  );
}

// §II.15 Panel checklisty kroku (montaż / szkolenie). §II.9 Zakończenie wymaga
// odhaczenia wszystkiego ALBO podania powodu. §II.21 Pasek postępu punktów.
function CheckPanel({ points, title, doneLabel, pending, onDone, onProgress }: { points: string[]; title: string; doneLabel: string; pending: boolean; onDone: (reason?: string) => void; onProgress: (frac: number) => void }) {
  const [checked, setChecked] = useState<boolean[]>(points.map(() => false));
  const [reason, setReason] = useState("");
  const doneCount = checked.filter(Boolean).length;
  const allDone = doneCount === points.length;
  const canFinish = allDone || reason.trim().length >= 3;
  const toggle = (i: number) => {
    const next = checked.map((v, j) => (j === i ? !v : v));
    setChecked(next);
    onProgress(next.filter(Boolean).length / points.length);
  };
  return (
    <div>
      <StepProgressHeader label={title} done={doneCount} total={points.length} />
      <div className="mb-3 flex flex-col gap-1.5">
        {points.map((p, i) => (
          <button
            key={p}
            onClick={() => toggle(i)}
            className="flex items-start gap-2.5 rounded-[10px] border border-border bg-surface px-2.5 py-2 text-left"
          >
            <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border-2" style={{ background: checked[i] ? "#22c55e" : "transparent", borderColor: checked[i] ? "#22c55e" : "#3a3d4a" }}>
              {checked[i] && <Icon name="check" className="h-3 w-3 text-[#08170d]" />}
            </span>
            <span className="text-[12.5px] font-semibold text-ink">{p}</span>
          </button>
        ))}
      </div>
      {!allDone && (
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nie wszystko odhaczone — podaj powód, aby zakończyć" className="mb-2.5 w-full rounded-[10px] border border-[#3d3216] bg-[#241e10] px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent" />
      )}
      <DoneButton pending={pending || !canFinish} onClick={() => onDone(allDone ? undefined : reason)} label={`${doneLabel}${!allDone ? ` (${doneCount}/${points.length})` : ""}`} block />
    </div>
  );
}

function PhotosPanel({ jobId, ctx, pending, onDone, onProgress }: { jobId: string; ctx: RealizationContext; pending: boolean; onDone: () => void; onProgress: (frac: number) => void }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);

  const PHOTO_TARGET = 3; // sugerowana liczba zdjęć gotowego ustawienia
  const shownCount = ctx.photos.length + localPreviews.length;

  const bump = () => onProgress(Math.min(1, (shownCount + 1) / PHOTO_TARGET));

  const onPick = async (file: File | null) => {
    if (!file) return;
    setError(null);
    // Tryb demo (brak Supabase): tylko podgląd lokalny.
    if (!ctx.canUpload) {
      setLocalPreviews((p) => [URL.createObjectURL(file), ...p]);
      bump();
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${jobId}/${crypto.randomUUID()}.${ext}`;
    let uploaded = false;
    try {
      const { error: upErr } = await supabase.storage.from(REALIZATIONS_BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw new Error(upErr.message);
      uploaded = true;
      const res = await createJobPhotoAction(jobId, path);
      if (!res.ok) throw new Error(res.error ?? "Nie udało się zapisać.");
      uploaded = false; // sukces — plik ma już wiersz w job_photos
      bump(); // §pasek: postęp podnosimy DOPIERO po udanym zapisie
      router.refresh();
    } catch (e) {
      // Rollback: usuń osierocony plik, gdy zapis metadanych zawiódł (best-effort).
      if (uploaded) await supabase.storage.from(REALIZATIONS_BUCKET).remove([path]).catch(() => {});
      setError(e instanceof Error ? e.message : "Nie udało się wysłać zdjęcia.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <StepProgressHeader label="Zdjęcia" done={Math.min(shownCount, PHOTO_TARGET)} total={PHOTO_TARGET} />
      <p className="mb-2.5 text-[12.5px] text-ink-2">Zrób zdjęcia gotowego ustawienia:</p>
      <div className="mb-2 grid grid-cols-3 gap-2">
        {ctx.photos.map((ph) => (
          <div key={ph.id} className="aspect-square overflow-hidden rounded-[11px] border border-border bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ph.url} alt="Zdjęcie realizacji" className="h-full w-full object-cover" />
          </div>
        ))}
        {localPreviews.map((url, i) => (
          <div key={`local-${i}`} className="aspect-square overflow-hidden rounded-[11px] border border-border bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Podgląd" className="h-full w-full object-cover opacity-80" />
          </div>
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[11px] border border-dashed border-[#3a3d4a] bg-surface text-center">
          <Icon name={uploading ? "refresh" : "camera"} className={`mb-1 h-5 w-5 text-ink-2 ${uploading ? "animate-spin" : ""}`} />
          <span className="px-1 text-[10px] font-semibold leading-tight text-ink-2">{uploading ? "Wysyłanie…" : "Dodaj zdjęcie"}</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading} onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      {error && <div className="mb-2"><Alert tone="bad" title="Błąd">{error}</Alert></div>}
      {!ctx.canUpload && <p className="mb-3 text-[10.5px] text-ink-2/70">Tryb demo — zdjęcia tylko podglądowo (bez zapisu).</p>}
      <DoneButton pending={pending} onClick={onDone} label="Zdjęcia gotowe" block />
    </div>
  );
}

function SettlementPanel({ jobId, ctx, pending, onDone, onProgress }: { jobId: string; ctx: RealizationContext; pending: boolean; onDone: () => void; onProgress: (frac: number) => void }) {
  const router = useRouter();
  const b = ctx.billing;
  // §II.2 Kwota do zapłaty na miejscu = suma − zadatek (a nie cała cena − zadatek historyczny).
  const onSite = b ? b.toPayOnSite : ctx.toPay;
  const [reportPending, startReport] = useTransition();
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState<string>(onSite != null && onSite > 0 ? String(onSite) : "");
  const [reported, setReported] = useState(ctx.paymentReported);
  const [error, setError] = useState<string | null>(null);

  const methods: PaymentMethod[] = ["CASH", "BLIK", "TRANSFER", "CARD"];
  // §II.21 Postęp rozliczenia: płatność zgłoszona + podpis klienta (2 elementy).
  const settleDone = (reported ? 1 : 0) + (ctx.hasSignature ? 1 : 0);

  const report = () => {
    setError(null);
    const value = Number(amount.replace(",", "."));
    startReport(async () => {
      const res = await reportFieldPaymentAction(jobId, method, value);
      if (res.ok) { setReported(true); onProgress((1 + (ctx.hasSignature ? 1 : 0)) / 2); router.refresh(); }
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <div>
      <StepProgressHeader label="Rozliczenie" done={settleDone} total={2} />

      {/* §II.2 Rozbicie rozliczenia: Pakiet / Dodatki / Transport / Suma / Zadatek / Do zapłaty na miejscu */}
      {b ? (
        <div className="mb-3 rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[12px]">
          <Row label={`Pakiet${b.packageName ? ` · ${b.packageName}` : ""}`} value={fmtPLN(b.packagePrice)} />
          {b.addons.length > 0 ? (
            <>
              <div className="mt-1 flex items-center justify-between"><span className="text-ink-2">Dodatki</span><span className="font-semibold text-ink">{fmtPLN(b.addonsTotal)}</span></div>
              <div className="mb-0.5 mt-0.5 flex flex-col gap-0.5 pl-2.5">
                {b.addons.map((a, i) => (
                  <div key={`${a.name}-${i}`} className="flex items-center justify-between text-[11px] text-ink-2"><span className="truncate pr-2">• {a.name}</span><span>{fmtPLN(a.price)}</span></div>
                ))}
              </div>
            </>
          ) : (
            <Row label="Dodatki" value="—" />
          )}
          <Row label="Transport" value={b.transport > 0 ? fmtPLN(b.transport) : "—"} />
          {b.discount > 0 && <Row label="Rabat" value={`− ${fmtPLN(b.discount)}`} />}
          <div className="my-1.5 border-t border-border" />
          <div className="flex items-center justify-between"><span className="font-semibold text-ink">Suma</span><span className="font-display text-[14px] font-bold text-ink">{fmtPLN(b.total)}</span></div>
          <div className="flex items-center justify-between"><span className="text-ink-2">Zadatek{b.depositSuggested ? " (sugerowany)" : ""}</span><span className="font-semibold text-ink">− {fmtPLN(b.deposit)}</span></div>
          <div className="mt-1 flex items-center justify-between rounded-[8px] bg-[#16301f] px-2 py-1.5"><span className="font-bold text-ok">Do zapłaty na miejscu</span><span className="font-display text-[15px] font-bold text-ok">{fmtPLN(b.toPayOnSite)}</span></div>
        </div>
      ) : (
        <div className="mb-2 flex items-center justify-between rounded-[10px] bg-surface px-3 py-2.5">
          <span className="text-[12px] font-semibold text-ink-2">Do zapłaty</span>
          <span className="font-display text-[15px] font-bold text-ink">{fmtPLN(ctx.toPay)}</span>
        </div>
      )}

      {/* §II.15 Kaucja pobierana na miejscu (zwracana przy demontażu). */}
      <div className="mb-3 flex items-center justify-between rounded-[10px] border border-border bg-surface px-3 py-2 text-[12px]">
        <span className="font-semibold text-ink-2">Kaucja (zwrotna)</span>
        <span className="font-bold text-ink">1 000 zł</span>
      </div>

      {reported ? (
        <div className="mb-3"><Alert tone="ok" title="Płatność zgłoszona">Szef zweryfikuje odbiór w zakładce Płatności.</Alert></div>
      ) : (
        <>
          {error && <div className="mb-2.5"><Alert tone="bad" title="Błąd">{error}</Alert></div>}
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {methods.map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={`rounded-[9px] px-3 py-1.5 text-[12px] font-bold ${method === m ? "bg-brand text-white" : "border border-border bg-surface text-ink-2"}`}>
                {PAYMENT_METHOD_LABELS[m]}
              </button>
            ))}
          </div>
          <div className="mb-3 flex gap-2">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Kwota (zł)"
              className="w-32 rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-ink outline-none focus:border-brand"
            />
            <button onClick={report} disabled={reportPending} className="flex-1 rounded-[10px] bg-[#271b3f] px-3 py-2 text-[12.5px] font-bold text-[#e0c8ff]">
              {reportPending ? "Zapisywanie…" : "Zgłoś odbiór płatności"}
            </button>
          </div>
        </>
      )}

      <Link href={ctx.signatureHref} className="mb-3 flex items-center justify-center gap-2 rounded-[11px] border border-border bg-surface-2 py-2.5 text-[12.5px] font-bold text-ink">
        <Icon name="signature" className="h-4 w-4" />
        {ctx.hasSignature ? "Podpis zapisany — podgląd" : "Podpis klienta / protokół"}
      </Link>

      <DoneButton pending={pending} onClick={onDone} label="Rozliczenie zakończone" block />
    </div>
  );
}
