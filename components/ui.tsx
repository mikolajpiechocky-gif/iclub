"use client";
// =====================================================================
// iClub Management — bazowe komponenty UI (bez zewnętrznych bibliotek).
// Cały moduł oznaczony "use client" dla wygody — komponenty czysto
// prezentacyjne (StatusBadge, MetricCard, SectionCard, ProgressBar,
// EmptyState, Alert) mogą być użyte także w Server Components, jeśli
// przeniesiesz je do osobnego pliku bez "use client".
// =====================================================================

import { useEffect, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { STATUS_META } from "@/lib/demo-data";
import type { StatusKey, SyncState } from "@/lib/types";

/* ---------------------- StatusBadge -----------------------------------
   Status = KOLOR + KROPKA + TEKST (nigdy sam kolor). */
export function StatusBadge({ status, className = "" }: { status: StatusKey; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
      style={{ background: m.bg, color: m.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.fg }} aria-hidden />
      {m.label}
    </span>
  );
}

/* ---------------------- Pill (uniwersalny status) ---------------------
   Etykieta + kropka + tekst z dowolnymi kolorami (np. statusy zapytań). */
export function Pill({ label, fg, bg, className = "" }: { label: string; fg: string; bg: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
      style={{ background: bg, color: fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: fg }} aria-hidden />
      {label}
    </span>
  );
}

/* ---------------------- MetricCard ------------------------------------ */
const TONE_FG: Record<string, string> = { neutral: "var(--color-ink)", warn: "var(--color-warn)", bad: "var(--color-bad)", ok: "var(--color-ok)" };
export function MetricCard({ label, value, sub, tone = "neutral" }: { label: string; value: string; sub?: string; tone?: "neutral" | "warn" | "bad" | "ok" }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="h-8 text-[11.5px] font-semibold leading-tight text-ink-2">{label}</div>
      <div className="font-display text-[22px] font-bold whitespace-nowrap" style={{ color: TONE_FG[tone], marginTop: 6 }}>{value}</div>
      {sub && <div className="text-[11px] font-semibold" style={{ color: tone === "neutral" ? "var(--color-ink-2)" : TONE_FG[tone] }}>{sub}</div>}
    </div>
  );
}

/* ---------------------- SectionCard ----------------------------------- */
export function SectionCard({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card-lg border border-border bg-surface ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between px-4 pt-4 pb-2">
          {title && <h2 className="font-display text-[15px] font-bold text-white">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* ---------------------- Buttons --------------------------------------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: IconName; block?: boolean };
export function PrimaryButton({ icon, block, className = "", children, ...p }: BtnProps) {
  return (
    <button
      className={`bg-brand inline-flex min-h-[44px] items-center justify-center gap-2 rounded-field px-4 text-[13px] font-bold text-white shadow-[0_6px_18px_rgba(225,29,116,0.4)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none ${block ? "w-full" : ""} ${className}`}
      {...p}
    >
      {icon && <Icon name={icon} className="h-4 w-4" />}
      {children}
    </button>
  );
}
export function SecondaryButton({ icon, block, className = "", children, ...p }: BtnProps) {
  return (
    <button
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-field border border-border bg-surface-2 px-4 text-[13px] font-semibold text-ink transition active:scale-[0.98] disabled:opacity-40 ${block ? "w-full" : ""} ${className}`}
      {...p}
    >
      {icon && <Icon name={icon} className="h-4 w-4" />}
      {children}
    </button>
  );
}

/* ---------------------- Pola formularza ------------------------------- */
export function TextField({ label, hint, error, id, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const fid = id || label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="text-[12.5px] font-semibold text-ink-2">{label}</label>
      <input
        id={fid}
        className={`min-h-[44px] rounded-field border bg-surface-2 px-3.5 text-[14px] text-ink placeholder:text-muted outline-none transition focus:border-accent ${error ? "border-bad" : "border-border"}`}
        aria-invalid={!!error}
        {...p}
      />
      {error ? <span className="text-[11.5px] font-semibold text-bad">{error}</span> : hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
    </div>
  );
}
export function SelectField({ label, children, id, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const fid = id || label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="text-[12.5px] font-semibold text-ink-2">{label}</label>
      <select id={fid} className="min-h-[44px] rounded-field border border-border bg-surface-2 px-3 text-[14px] text-ink outline-none focus:border-accent" {...p}>
        {children}
      </select>
    </div>
  );
}

/* ---------------------- ProgressBar ----------------------------------- */
export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-2.5 overflow-hidden rounded-full bg-[#23262f] ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="bg-brand h-full rounded-full transition-[width] duration-300" style={{ width: `${value}%` }} />
    </div>
  );
}

/* ---------------------- ChecklistItem --------------------------------- */
export function ChecklistItem({ label, meta, done, required, onToggle }: { label: string; meta?: string; done: boolean; required?: boolean; onToggle?: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-[13px] border bg-surface px-3.5 py-3 text-left transition ${done ? "border-[#1e3d2a]" : "border-border"}`}
    >
      <span
        className="flex h-6 w-6 flex-none items-center justify-center rounded-lg border-2 text-[#08170d]"
        style={{ background: done ? "#22c55e" : "transparent", borderColor: done ? "#22c55e" : "#3a3d4a" }}
      >
        {done && <Icon name="check" className="h-3.5 w-3.5" />}
      </span>
      <span className="flex-1">
        <span className="block text-[13.5px] font-bold" style={{ color: done ? "var(--color-muted)" : "var(--color-ink)" }}>{label}</span>
        {meta && <span className="block text-[11px] font-semibold text-ink-2">{meta}</span>}
      </span>
      {required && !done && <span className="rounded-md bg-[#341a1d] px-1.5 py-0.5 text-[9.5px] font-bold text-bad">WYMAGANE</span>}
    </button>
  );
}

/* ---------------------- EmptyState ------------------------------------ */
export function EmptyState({ icon = "inbox", title, desc, action }: { icon?: IconName; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-[#2e313d] px-6 py-14 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-2"><Icon name={icon} className="h-6 w-6" /></span>
      <div className="text-[15px] font-bold text-ink">{title}</div>
      {desc && <div className="mt-1 max-w-xs text-[13px] text-ink-2">{desc}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------------------- Alert ----------------------------------------- */
const ALERT_TONE: Record<string, { bg: string; br: string; fg: string; icon: IconName }> = {
  info: { bg: "#141f33", br: "#243654", fg: "#7fa8f5", icon: "wifi" },
  warn: { bg: "#241e10", br: "#3d3216", fg: "#ebb05a", icon: "warning" },
  bad: { bg: "#251215", br: "#3d1f23", fg: "#f58585", icon: "warning" },
  ok: { bg: "#12241a", br: "#1e3d2a", fg: "#5fd68b", icon: "check" },
};
export function Alert({ tone = "info", title, children }: { tone?: "info" | "warn" | "bad" | "ok"; title: string; children?: ReactNode }) {
  const t = ALERT_TONE[tone];
  return (
    <div className="flex gap-3 rounded-card border p-3.5" style={{ background: t.bg, borderColor: t.br }} role="alert">
      <span className="flex-none" style={{ color: t.fg }}><Icon name={t.icon} className="mt-0.5 h-5 w-5" /></span>
      <div>
        <div className="text-[13px] font-bold" style={{ color: t.fg }}>{title}</div>
        {children && <div className="mt-0.5 text-[12px] text-ink-2">{children}</div>}
      </div>
    </div>
  );
}

/* ---------------------- Modal (desktop) ------------------------------- */
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-card-lg border border-border bg-surface shadow-[var(--shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border-soft px-5 py-4">
          <h3 className="font-display text-[16px] font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-ink-2 hover:text-ink" aria-label="Zamknij"><Icon name="x" className="h-5 w-5" /></button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-border-soft px-5 py-4">{footer}</footer>}
      </div>
    </div>
  );
}

/* ---------------------- BottomSheet (mobile) -------------------------- */
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full rounded-t-[24px] border-t border-border bg-surface p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[16px] font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-ink-2" aria-label="Zamknij"><Icon name="x" className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------------- SyncStatus ------------------------------------
   Stany bez języka technicznego. */
export const SYNC_META: Record<SyncState, { label: string; title: string; desc: string; dot: string; bg: string; fg: string; cardBg: string; cardBr: string }> = {
  synced:  { label: "Zsynchronizowano", title: "Wszystko zapisane", desc: "Dane wysłane do serwera", dot: "#22c55e", bg: "#16301f", fg: "#5fd68b", cardBg: "#12241a", cardBr: "#1e3d2a" },
  online:  { label: "Online", title: "Połączono", desc: "Zmiany zapisują się na bieżąco", dot: "#22c55e", bg: "#16301f", fg: "#5fd68b", cardBg: "#12241a", cardBr: "#1e3d2a" },
  syncing: { label: "Synchronizacja…", title: "Trwa wysyłanie", desc: "Zapisujemy Twoje zmiany", dot: "#3b82f6", bg: "#182238", fg: "#7fa8f5", cardBg: "#141f33", cardBr: "#243654" },
  pending: { label: "Zmiany oczekują", title: "Zmiany zapisane lokalnie", desc: "Wyślemy je, gdy wróci zasięg", dot: "#e08600", bg: "#332814", fg: "#ebb05a", cardBg: "#241e10", cardBr: "#3d3216" },
  offline: { label: "Offline", title: "Pracujesz offline", desc: "Dane są bezpieczne na telefonie", dot: "#8a90a0", bg: "#22242e", fg: "#9aa0b2", cardBg: "#1a1c24", cardBr: "#2a2d3a" },
  error:   { label: "Błąd wysyłki", title: "Nie udało się wysłać", desc: "Dotknij, aby spróbować ponownie", dot: "#ef4444", bg: "#341a1d", fg: "#f58585", cardBg: "#251215", cardBr: "#3d1f23" },
};

export function SyncBadge({ state, count, onClick }: { state: SyncState; count?: number; onClick?: () => void }) {
  const m = SYNC_META[state];
  const label = state === "pending" && count ? `${count} oczekuje` : m.label;
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 whitespace-nowrap" style={{ background: m.bg }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} aria-hidden />
      <span className="text-[10.5px] font-bold" style={{ color: m.fg }}>{label}</span>
    </button>
  );
}

export function SyncStatusCard({ state, onClick }: { state: SyncState; onClick?: () => void }) {
  const m = SYNC_META[state];
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-card border p-3.5 text-left" style={{ background: m.cardBg, borderColor: m.cardBr }}>
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px]" style={{ background: m.bg }}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.dot }} />
      </span>
      <span className="flex-1">
        <span className="block text-[13px] font-bold" style={{ color: m.fg }}>{m.title}</span>
        <span className="block text-[11.5px] text-ink-2">{m.desc}</span>
      </span>
    </button>
  );
}
