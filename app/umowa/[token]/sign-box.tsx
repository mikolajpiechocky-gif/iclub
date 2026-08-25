"use client";
// Interaktywna część podpisu: „Wyślij kod" → wpisanie kodu + zgoda na Regulamin → „Podpisz".
import { useState } from "react";

const ERR: Record<string, string> = {
  already_signed: "Ta umowa została już podpisana.",
  code_expired: "Kod wygasł — poproś o nowy.",
  too_many_attempts: "Za dużo prób. Poproś o nowy kod.",
  too_many_requests: "Za często proszono o kod. Odczekaj chwilę.",
  invalid_code: "Nieprawidłowy kod.",
  regulamin_required: "Zaznacz akceptację Regulaminu.",
  email_not_configured: "Wysyłka e-mail nie jest jeszcze aktywna — skontaktuj się z iClub.",
  email_send_failed: "Nie udało się wysłać kodu. Spróbuj ponownie za chwilę.",
  token_expired: "Link do umowy wygasł.",
  not_available: "Umowa nie jest dostępna do podpisu.",
  not_found: "Nie znaleziono umowy.",
};
const errText = (e: string) => ERR[e] || "Wystąpił błąd. Spróbuj ponownie.";

export function SignBox({ token, regulaminUrl }: { token: string; regulaminUrl: string }) {
  const [phase, setPhase] = useState<"idle" | "code">("idle");
  const [code, setCode] = useState("");
  const [reg, setReg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  async function requestCode() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await fetch(`/api/public/contract/${token}/code`, { method: "POST" });
      const j = await r.json();
      if (!j.ok) setErr(errText(j.error));
      else { setPhase("code"); setMsg("Kod wysłaliśmy na Twój e-mail. Jest ważny 15 minut."); }
    } catch { setErr("Błąd sieci — sprawdź połączenie."); } finally { setBusy(false); }
  }

  async function sign() {
    if (!reg) { setErr("Zaznacz akceptację Regulaminu."); return; }
    if (code.trim().length !== 6) { setErr("Kod to 6 cyfr."); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/public/contract/${token}/sign`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), zgodaRegulamin: reg }),
      });
      const j = await r.json();
      if (!j.ok) setErr(errText(j.error)); else setSignedAt(j.signedAt);
    } catch { setErr("Błąd sieci — sprawdź połączenie."); } finally { setBusy(false); }
  }

  if (signedAt) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
        <div className="text-lg font-bold">Umowa zawarta ✓</div>
        <p className="mt-1 text-sm">Data zawarcia: {new Date(signedAt).toLocaleString("pl-PL")}. Potwierdzenie i dane do zapłaty wyślemy na Twój e-mail.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4">
      <label className="flex items-start gap-2 text-sm text-gray-800">
        <input type="checkbox" className="mt-1" checked={reg} onChange={(e) => setReg(e.target.checked)} />
        <span>Akceptuję <a href={regulaminUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">Regulamin iClub</a> oraz treść powyższej umowy.</span>
      </label>

      {phase === "idle" ? (
        <button onClick={requestCode} disabled={busy || !reg}
          className="mt-3 w-full rounded-md bg-gray-900 px-4 py-2.5 font-semibold text-white disabled:opacity-50">
          {busy ? "Wysyłanie…" : "Wyślij kod na e-mail"}
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <input inputMode="numeric" maxLength={6} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Kod z e-maila (6 cyfr)"
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-center text-lg tracking-[0.4em]" />
          <button onClick={sign} disabled={busy || !reg}
            className="w-full rounded-md bg-emerald-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">
            {busy ? "Podpisywanie…" : "Podpisz umowę"}
          </button>
          <button onClick={requestCode} disabled={busy}
            className="w-full text-sm font-medium text-gray-600 underline">
            Wyślij kod ponownie
          </button>
        </div>
      )}

      {msg && <p className="mt-2 text-sm text-emerald-700">{msg}</p>}
      {err && <p className="mt-2 text-sm font-medium text-red-600">{err}</p>}
      <p className="mt-3 text-xs text-gray-500">Wpisanie kodu z e-maila oznacza zawarcie umowy w formie dokumentowej (art. 77² k.c.). Zapiszemy czas, adres e-mail, adres IP i przeglądarkę jako dowód zawarcia.</p>
    </div>
  );
}
