"use client";
// Przyciski obsługi leada: odgrzej, blokada auto-zamknięcia, ręczne auto-zamykanie.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reactivateInquiryAction, setInquiryAutoCloseBlockedAction, autoCloseStaleLeadsAction, deleteInquiryAction } from "./actions";
import { createReservationFromInquiryAction } from "../reservations/actions";

// §konfigurator „Utwórz rezerwację (bez umowy)" — zakłada rezerwację z zapytania i przenosi do edycji.
export function CreateReservationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const run = () => {
    setErr(null);
    start(async () => {
      const r = await createReservationFromInquiryAction(id);
      if (r.ok && r.reservationId) { router.push(`/reservations/${r.reservationId}/edit`); return; }
      setErr(r.error ?? "Nie udało się utworzyć rezerwacji.");
    });
  };
  return (
    <div className="flex flex-col gap-1">
      <button onClick={run} disabled={pending} className="rounded-field bg-brand px-3.5 py-2 text-[12.5px] font-bold text-white shadow-[0_6px_18px_rgba(225,29,116,0.4)] disabled:opacity-50">
        {pending ? "Tworzę rezerwację…" : "✅ Utwórz rezerwację (bez umowy)"}
      </button>
      {err && <span className="text-[11.5px] font-semibold text-bad">{err}</span>}
    </div>
  );
}

export function DeleteInquiryButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = () => {
    if (!window.confirm("Usunąć to zapytanie na stałe? Tej operacji nie można cofnąć.")) return;
    start(async () => {
      const r = await deleteInquiryAction(id);
      if (r.ok) router.push("/inquiries");
      else window.alert(r.error ?? "Nie udało się usunąć.");
    });
  };
  return (
    <button onClick={run} disabled={pending} className="rounded-field border border-[#3d1f23] bg-[#251215] px-3.5 py-2 text-[12.5px] font-bold text-bad disabled:opacity-50">
      {pending ? "Usuwanie…" : "Usuń zapytanie"}
    </button>
  );
}

export function ReactivateButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = () => start(async () => { await reactivateInquiryAction(id); router.refresh(); });
  return (
    <button onClick={run} disabled={pending} className="rounded-field bg-[#33230f] px-3.5 py-2 text-[12.5px] font-bold text-[#f6a94a] disabled:opacity-50">
      {pending ? "…" : "🔥 Odgrzej leada"}
    </button>
  );
}

export function AutoCloseBlockToggle({ id, blocked }: { id: string; blocked: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [on, setOn] = useState(blocked);
  const toggle = () => start(async () => { const next = !on; setOn(next); await setInquiryAutoCloseBlockedAction(id, next); router.refresh(); });
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-ink-2">
      <input type="checkbox" checked={on} onChange={toggle} disabled={pending} className="h-4 w-4 accent-accent" />
      Blokuj auto-zamknięcie
    </label>
  );
}

export function AutoCloseButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = () => start(async () => {
    const r = await autoCloseStaleLeadsAction();
    setMsg(r.ok ? `Zamknięto ${r.closed}` : r.error ?? "Błąd");
    if (r.ok) router.refresh();
  });
  return (
    <button onClick={run} disabled={pending} className="rounded-field border border-border bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-ink-2 disabled:opacity-50">
      {pending ? "Zamykam…" : msg ?? "Zamknij nieaktywne (21 dni)"}
    </button>
  );
}
