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
import { REALIZATIONS_BUCKET } from "@/lib/config/storage";
import { advanceStageAction, reportFieldPaymentAction } from "./actions";
import { createJobPhotoAction } from "./photo-actions";
import { reportEquipmentStatusAction, type EqStatus } from "./protocol-actions";

const fmtPLN = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

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
  navUrl: string | null;
  toPay: number | null;
  hasSignature: boolean;
  paymentReported: boolean;
  signatureHref: string;
  photos: { id: string; url: string }[];
  canUpload: boolean;
  teardownItems: string[]; // §II.8 sprzęt do kontroli przy demontażu (z checklisty)
  hasVehicle: boolean;     // §II.14 pojazd przypisany (wymagany, by rozpocząć)
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

  const setStatus = (stageId: string, status: "DONE" | "TODO") => {
    setError(null);
    startTransition(async () => {
      const res = await advanceStageAction(stageId, jobId, status);
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
      {allDone && <div className="mb-1"><Alert tone="ok" title="Realizacja zakończona">Wszystkie kroki odhaczone. Dziękujemy!</Alert></div>}

      <div>
        {steps.map((s, i) => {
          const isDone = s.status === "DONE";
          const isCurrent = i === currentIndex;
          const fill = stepFill(i, isDone);
          return (
            <div key={s.id} className="flex gap-3">
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

                {/* §II.21 Pasek postępu kroku (100% gdy gotowy, żywy ułamek gdy bieżący) */}
                <div className="mt-1.5"><ProgressBar value={fill} tone={isDone ? "ok" : "accent"} height={4} /></div>

                {isCurrent && (
                  <div className="mt-2 rounded-[13px] border border-[#2a2340] bg-[#181423] p-3.5">
                    <StepPanel jobId={jobId} stageKey={s.stage_key} ctx={ctx} pending={pending} onDone={() => setStatus(s.id, "DONE")} onProgress={(frac) => setCurProg({ step: i, frac })} />
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

/* ------------------- Panel czynności dla danego kroku ---------------- */
function StepPanel({ jobId, stageKey, ctx, pending, onDone, onProgress }: { jobId: string; stageKey: string; ctx: RealizationContext; pending: boolean; onDone: () => void; onProgress: (frac: number) => void }) {
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
      // §II.15 Namiot rozstawiony, impreza w toku — czekamy na jej koniec, potem demontaż.
      return (
        <div>
          <div className="mb-3 rounded-[11px] border border-[#2a2340] bg-[#1a1526] px-3 py-3 text-center">
            <div className="text-[13px] font-bold text-[#e9d5ff]">Namiot rozstawiony — wynajem trwa</div>
            <div className="mt-1 text-[11.5px] text-ink-2">Kaucja 1 000 zł pobrana. Wróć na demontaż po zakończeniu imprezy.</div>
          </div>
          <DoneButton pending={pending} onClick={onDone} label="Impreza zakończona — demontaż" block />
        </div>
      );

    case "TEARDOWN":
      return <TeardownPanel jobId={jobId} items={ctx.teardownItems} pending={pending} onDone={onDone} onProgress={onProgress} />;

    default:
      return <DoneButton pending={pending} onClick={onDone} label="Gotowe" block />;
  }
}

// §II.8 Demontaż: kontrola sprzętu po tej samej checkliście. Dla każdej pozycji: OK
// (nic nie klikasz) / Czyszczenie / Uszkodzony / Brak → zgłoszenie serwisowe.
function TeardownPanel({ jobId, items, pending, onDone, onProgress }: { jobId: string; items: string[]; pending: boolean; onDone: () => void; onProgress: (frac: number) => void }) {
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState<Record<string, string>>({});
  const [deduction, setDeduction] = useState(""); // §II.16 potrącenie z kaucji za uszkodzenia
  const deducted = Number(deduction.replace(",", ".")) || 0;
  const reviewed = Object.keys(reported).length;

  const applyStatus = (item: string, status: string) => {
    const next = { ...reported, [item]: status };
    setReported(next);
    onProgress(items.length ? Object.keys(next).length / items.length : 0);
  };
  // Problem trafia do zgłoszeń serwisowych; „OK" tylko potwierdza sprawdzenie pozycji.
  const report = (item: string, status: EqStatus) => {
    setError(null);
    startBusy(async () => {
      const res = await reportEquipmentStatusAction(jobId, item, status, "");
      if (res.ok) applyStatus(item, status);
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <div>
      {items.length > 0 && <StepProgressHeader label="Sprawdzony sprzęt" done={reviewed} total={items.length} />}
      <p className="mb-3 text-[12.5px] text-ink-2">Zdemontuj i sprawdź każdy element. Potwierdź „OK”, a problem zaznacz — trafi do zgłoszeń serwisowych.</p>
      {error && <div className="mb-2"><Alert tone="bad" title="Błąd">{error}</Alert></div>}
      {items.length > 0 ? (
        <div className="mb-3 flex flex-col gap-1.5">
          {items.map((it) => {
            const st = reported[it];
            const ok = st === "OK";
            return (
              <div key={it} className={`rounded-[10px] border px-2.5 py-2 ${ok ? "border-[#1d3a28] bg-[#12271b]" : st ? "border-[#3d3216] bg-[#241e10]" : "border-border bg-surface"}`}>
                <div className="mb-1.5 text-[12.5px] font-semibold text-ink">{it}{st && <span className={`ml-1.5 text-[11px] font-bold ${ok ? "text-ok" : "text-warn"}`}>· {st}</span>}</div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => applyStatus(it, "OK")} className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-bold ${ok ? "border-ok bg-[#16301f] text-ok" : "border-border bg-surface-2 text-ink-2"}`}>OK</button>
                  {(["Czyszczenie", "Uszkodzony", "Brak"] as EqStatus[]).map((s) => (
                    <button key={s} onClick={() => report(it, s)} disabled={busy} className={`rounded-[8px] border px-2.5 py-1 text-[11px] font-bold ${st === s ? "border-warn bg-[#332814] text-warn" : "border-border bg-surface-2 text-ink-2"}`}>{s}</button>
                  ))}
                </div>
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

      <DoneButton pending={pending} onClick={onDone} label="Zakończone — sprzęt w bazie" block />
    </div>
  );
}

function DoneButton({ pending, onClick, label, block }: { pending: boolean; onClick: () => void; label: string; block?: boolean }) {
  return (
    <button onClick={onClick} disabled={pending} className={`rounded-[11px] bg-[#22c55e] py-2.5 text-[12.5px] font-bold text-[#08170d] ${block ? "w-full" : "flex-1 px-3.5"}`}>
      {label} ✓
    </button>
  );
}

// §II.15 Panel checklisty kroku (montaż / szkolenie). §II.9 Zakończenie wymaga
// odhaczenia wszystkiego ALBO podania powodu. §II.21 Pasek postępu punktów.
function CheckPanel({ points, title, doneLabel, pending, onDone, onProgress }: { points: string[]; title: string; doneLabel: string; pending: boolean; onDone: () => void; onProgress: (frac: number) => void }) {
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
      <DoneButton pending={pending || !canFinish} onClick={onDone} label={`${doneLabel}${!allDone ? ` (${doneCount}/${points.length})` : ""}`} block />
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

  const onPick = async (file: File | null) => {
    if (!file) return;
    setError(null);
    onProgress(Math.min(1, (shownCount + 1) / PHOTO_TARGET));
    // Tryb demo (brak Supabase): tylko podgląd lokalny.
    if (!ctx.canUpload) {
      setLocalPreviews((p) => [URL.createObjectURL(file), ...p]);
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
  const [reportPending, startReport] = useTransition();
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState<string>(ctx.toPay != null && ctx.toPay > 0 ? String(ctx.toPay) : "");
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
      <div className="mb-2 flex items-center justify-between rounded-[10px] bg-surface px-3 py-2.5">
        <span className="text-[12px] font-semibold text-ink-2">Do zapłaty</span>
        <span className="font-display text-[15px] font-bold text-ink">{fmtPLN(ctx.toPay)}</span>
      </div>
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
