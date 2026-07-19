"use client";
// app/(app)/signature/page.tsx — Podpis klienta (MOBILE).
// Podsumowanie dokumentu, dane klienta, podpis palcem (canvas),
// wyczyszczenie, potwierdzenie, informacja o zapisie offline/online.
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import { formatPLN } from "@/lib/demo-data";

export default function SignaturePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#ecedf2";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e: React.PointerEvent) => { drawing.current = true; const { x, y } = pos(e); const ctx = canvasRef.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(x, y); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const { x, y } = pos(e); const ctx = canvasRef.current!.getContext("2d")!; ctx.lineTo(x, y); ctx.stroke(); setHasInk(true); };
  const end = () => { drawing.current = false; };
  const clear = () => { const c = canvasRef.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setHasInk(false); };

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="mb-3 flex items-center gap-2.5">
        <Link href="/field" className="text-[13px] font-bold text-ink-2">‹ Realizacja</Link>
        <span className="ml-auto text-[12px] font-semibold text-ink-2">Zlecenie #1042</span>
      </div>
      <h1 className="mb-4 font-display text-[22px] font-bold text-white">Podpis klienta</h1>

      {/* Podsumowanie dokumentu */}
      <div className="mb-4 rounded-card border border-border bg-surface p-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-ink-2">Protokół odbioru</div>
        {[["Klient", "Julia Nowicka"], ["Wydarzenie", "Osiemnastka · 45 os."], ["Namiot", "6×8 Blue · Premium"], ["Do zapłaty", formatPLN(4800)]].map(([k, v]) => (
          <div key={k} className="flex justify-between py-1.5 text-[13px] font-semibold"><span className="text-ink-2">{k}</span><span className="text-ink">{v}</span></div>
        ))}
      </div>

      {confirmed ? (
        <Alert tone="ok" title="Podpis zapisany">Zapisano na telefonie. Dokument wyśle się na serwer automatycznie, gdy wróci połączenie.</Alert>
      ) : (
        <>
          <div className="mb-2 text-[12.5px] font-semibold text-ink-2">Podpis palcem</div>
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="h-44 w-full touch-none rounded-card border border-border bg-surface-2"
          />
          <div className="mt-3 flex gap-2.5">
            <SecondaryButton block onClick={clear} disabled={!hasInk}>Wyczyść</SecondaryButton>
            <PrimaryButton block icon="check" disabled={!hasInk} onClick={() => setConfirmed(true)}>Potwierdź podpis</PrimaryButton>
          </div>
          <p className="mt-3 text-center text-[11.5px] text-ink-2">Podpis zostanie zapisany lokalnie i wysłany po odzyskaniu połączenia.</p>
        </>
      )}
    </div>
  );
}
