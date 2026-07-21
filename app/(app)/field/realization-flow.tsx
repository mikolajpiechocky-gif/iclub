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

const fmtPLN = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);

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
      </div>

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
}

const TRAINING_POINTS = [
  "Obsługa dmuchawy i zasilania",
  "Zasady bezpieczeństwa (dzieci, bez butów, bez ostrych przedmiotów)",
  "Zakaz samodzielnej zmiany ustawień sprzętu",
  "Kontakt awaryjny do iClub",
];

export function RealizationFlow({ jobId, steps, ctx }: { jobId: string; steps: JobStageRecord[]; ctx: RealizationContext }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const doneCount = steps.filter((s) => s.status === "DONE").length;
  const currentIndex = steps.findIndex((s) => s.status !== "DONE");
  const allDone = currentIndex === -1;

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
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#271b3f] text-[#b98cf5]"><Icon name="truck" className="h-4.5 w-4.5" /></span>
        <div className="flex-1">
          <div className="font-display text-[15px] font-bold text-white">Realizacja</div>
          <div className="text-[11.5px] font-medium text-ink-2">{allDone ? "Wszystkie kroki gotowe" : `Krok ${doneCount + 1} z ${steps.length}`}</div>
        </div>
        <span className="font-display text-[13px] font-bold text-[#b98cf5]">{doneCount}/{steps.length}</span>
      </div>

      {error && <div className="mb-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}
      {allDone && <div className="mb-1"><Alert tone="ok" title="Realizacja zakończona">Wszystkie kroki odhaczone. Dziękujemy!</Alert></div>}

      <div>
        {steps.map((s, i) => {
          const isDone = s.status === "DONE";
          const isCurrent = i === currentIndex;
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

                {isCurrent && (
                  <div className="mt-2 rounded-[13px] border border-[#2a2340] bg-[#181423] p-3.5">
                    <StepPanel jobId={jobId} stageKey={s.stage_key} ctx={ctx} pending={pending} onDone={() => setStatus(s.id, "DONE")} />
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
function StepPanel({ jobId, stageKey, ctx, pending, onDone }: { jobId: string; stageKey: string; ctx: RealizationContext; pending: boolean; onDone: () => void }) {
  switch (stageKey) {
    case "TRAVEL":
      return (
        <div>
          <p className="mb-3 text-[12.5px] text-ink-2">Jedź na miejsce imprezy i potwierdź przyjazd.</p>
          <div className="flex gap-2.5">
            {ctx.navUrl ? (
              <a href={ctx.navUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-[11px] border border-border bg-surface-2 py-2.5 text-center text-[12.5px] font-bold text-ink">Nawiguj</a>
            ) : (
              <span className="flex-1 rounded-[11px] border border-border bg-surface-2 py-2.5 text-center text-[12.5px] font-bold text-ink-2/50">Brak adresu</span>
            )}
            <DoneButton pending={pending} onClick={onDone} label="Jestem na miejscu" />
          </div>
        </div>
      );

    case "SETUP":
      return (
        <div>
          <p className="mb-3 text-[12.5px] text-ink-2">Rozstaw namiot, podłącz dmuchawę i zasilanie, ustaw światło oraz nagłośnienie, sprawdź stabilność i kotwy.</p>
          <DoneButton pending={pending} onClick={onDone} label="Montaż gotowy" block />
        </div>
      );

    case "TRAINING":
      return <TrainingPanel pending={pending} onDone={onDone} />;

    case "PHOTOS":
      return <PhotosPanel jobId={jobId} ctx={ctx} pending={pending} onDone={onDone} />;

    case "SETTLEMENT":
      return <SettlementPanel jobId={jobId} ctx={ctx} pending={pending} onDone={onDone} />;

    case "TEARDOWN":
      return (
        <div>
          <p className="mb-3 text-[12.5px] text-ink-2">Zdemontuj namiot, spakuj sprzęt, wróć do bazy i rozładuj.</p>
          <DoneButton pending={pending} onClick={onDone} label="Zakończone — sprzęt w bazie" block />
        </div>
      );

    default:
      return <DoneButton pending={pending} onClick={onDone} label="Gotowe" block />;
  }
}

function DoneButton({ pending, onClick, label, block }: { pending: boolean; onClick: () => void; label: string; block?: boolean }) {
  return (
    <button onClick={onClick} disabled={pending} className={`rounded-[11px] bg-[#22c55e] py-2.5 text-[12.5px] font-bold text-[#08170d] ${block ? "w-full" : "flex-1 px-3.5"}`}>
      {label} ✓
    </button>
  );
}

function TrainingPanel({ pending, onDone }: { pending: boolean; onDone: () => void }) {
  const [checked, setChecked] = useState<boolean[]>(TRAINING_POINTS.map(() => false));
  const doneCount = checked.filter(Boolean).length;
  return (
    <div>
      <p className="mb-2.5 text-[12.5px] text-ink-2">Omów z klientem i odhacz:</p>
      <div className="mb-3 flex flex-col gap-1.5">
        {TRAINING_POINTS.map((p, i) => (
          <button
            key={p}
            onClick={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
            className="flex items-center gap-2.5 rounded-[10px] border border-border bg-surface px-2.5 py-2 text-left"
          >
            <span className="flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border-2" style={{ background: checked[i] ? "#22c55e" : "transparent", borderColor: checked[i] ? "#22c55e" : "#3a3d4a" }}>
              {checked[i] && <Icon name="check" className="h-3 w-3 text-[#08170d]" />}
            </span>
            <span className="text-[12.5px] font-semibold text-ink">{p}</span>
          </button>
        ))}
      </div>
      <DoneButton pending={pending} onClick={onDone} label={`Szkolenie przeprowadzone${doneCount ? ` (${doneCount}/${TRAINING_POINTS.length})` : ""}`} block />
    </div>
  );
}

function PhotosPanel({ jobId, ctx, pending, onDone }: { jobId: string; ctx: RealizationContext; pending: boolean; onDone: () => void }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);

  const onPick = async (file: File | null) => {
    if (!file) return;
    setError(null);
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

function SettlementPanel({ jobId, ctx, pending, onDone }: { jobId: string; ctx: RealizationContext; pending: boolean; onDone: () => void }) {
  const router = useRouter();
  const [reportPending, startReport] = useTransition();
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState<string>(ctx.toPay != null && ctx.toPay > 0 ? String(ctx.toPay) : "");
  const [reported, setReported] = useState(ctx.paymentReported);
  const [error, setError] = useState<string | null>(null);

  const methods: PaymentMethod[] = ["CASH", "BLIK", "TRANSFER", "CARD"];

  const report = () => {
    setError(null);
    const value = Number(amount.replace(",", "."));
    startReport(async () => {
      const res = await reportFieldPaymentAction(jobId, method, value);
      if (res.ok) { setReported(true); router.refresh(); }
      else setError(res.error ?? "Błąd");
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-[10px] bg-surface px-3 py-2.5">
        <span className="text-[12px] font-semibold text-ink-2">Do zapłaty</span>
        <span className="font-display text-[15px] font-bold text-ink">{fmtPLN(ctx.toPay)}</span>
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
