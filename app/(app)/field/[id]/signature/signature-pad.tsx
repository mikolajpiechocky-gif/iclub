"use client";
// Podpis palcem na canvasie → zapis jako obraz (data URL).
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton, SecondaryButton, TextField, Alert } from "@/components/ui";
import { saveSignatureAction } from "./actions";

export function SignaturePad({ jobId, defaultName }: { jobId: string; defaultName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const router = useRouter();
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const confirm = async () => {
    setError(null);
    setSaving(true);
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    const res = await saveSignatureAction(jobId, dataUrl, name);
    setSaving(false);
    if (res.ok) router.refresh();
    else setError(res.error ?? "Błąd");
  };

  return (
    <>
      {error && <div className="mb-3"><Alert tone="bad" title="Błąd">{error}</Alert></div>}
      <div className="mb-3"><TextField label="Podpisujący" placeholder="Imię i nazwisko klienta" value={name} onChange={(e) => setName(e.target.value)} /></div>
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
        <SecondaryButton block onClick={clear} disabled={!hasInk || saving}>Wyczyść</SecondaryButton>
        <PrimaryButton block icon="check" onClick={confirm} disabled={!hasInk || saving}>{saving ? "Zapisywanie…" : "Potwierdź podpis"}</PrimaryButton>
      </div>
    </>
  );
}
