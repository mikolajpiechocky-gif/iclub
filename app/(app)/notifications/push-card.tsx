"use client";
// Włączanie/wyłączanie powiadomień push (Web Push) + cisza nocna + test.
import { useEffect, useState, useTransition } from "react";
import { SectionCard, PrimaryButton, SecondaryButton, Alert } from "@/components/ui";
import { subscribePushAction, unsubscribePushAction, sendTestPushAction } from "./push-actions";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushCard() {
  const [pending, startTransition] = useTransition();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [quiet, setQuiet] = useState(true);
  const [quietFrom, setQuietFrom] = useState("22");
  const [quietTo, setQuietTo] = useState("7");

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      const ok = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && Boolean(VAPID);
      if (!active) return;
      setSupported(ok);
      if (!ok) return;
      setDenied(Notification.permission === "denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (active) setSubscribed(Boolean(sub));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const enable = () =>
    startTransition(async () => {
      setErr(null); setMsg(null);
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") { setDenied(perm === "denied"); setErr("Nie udzielono zgody na powiadomienia."); return; }
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) as unknown as BufferSource });
        const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
        const qf = quiet ? Number(quietFrom) : null;
        const qt = quiet ? Number(quietTo) : null;
        const res = await subscribePushAction(
          { endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! } },
          Number.isFinite(qf as number) ? qf : null,
          Number.isFinite(qt as number) ? qt : null,
        );
        if (res.ok) { setSubscribed(true); setMsg("Powiadomienia włączone na tym urządzeniu."); }
        else setErr(res.error ?? "Błąd.");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Nie udało się włączyć powiadomień.");
      }
    });

  const disable = () =>
    startTransition(async () => {
      setErr(null); setMsg(null);
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) { await unsubscribePushAction(sub.endpoint); await sub.unsubscribe(); }
        setSubscribed(false); setMsg("Powiadomienia wyłączone na tym urządzeniu.");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Nie udało się wyłączyć.");
      }
    });

  const test = () =>
    startTransition(async () => {
      setErr(null); setMsg(null);
      const res = await sendTestPushAction();
      if (res.ok) setMsg("Wysłano testowe powiadomienie — powinno pojawić się za chwilę.");
      else setErr(res.error ?? "Błąd.");
    });

  return (
    <SectionCard title="Powiadomienia push" className="mb-5 p-5">
      <div className="px-5 pb-5">
        {supported === false && (
          <Alert tone="info" title="Niedostępne na tym urządzeniu">
            Ta przeglądarka nie obsługuje powiadomień push. Na iPhone dodaj aplikację do ekranu głównego (Udostępnij → „Do ekranu początkowego”) i otwórz stamtąd.
          </Alert>
        )}
        {supported && (
          <>
            <p className="mb-3 text-[13px] text-ink-2">Otrzymuj powiadomienia o ważnych zdarzeniach (nowe zlecenie, przypisanie, wiadomość OLX, przypomnienie o pakowaniu…) nawet przy zamkniętej apce.</p>
            {denied && <div className="mb-3"><Alert tone="warn" title="Powiadomienia zablokowane">Odblokuj powiadomienia dla tej strony w ustawieniach przeglądarki, potem spróbuj ponownie.</Alert></div>}
            {err && <div className="mb-3"><Alert tone="bad" title="Błąd">{err}</Alert></div>}
            {msg && <div className="mb-3"><Alert tone="ok" title="OK">{msg}</Alert></div>}

            <label className="mb-2 flex items-center gap-2.5 text-[13px] text-ink">
              <input type="checkbox" checked={quiet} onChange={(e) => setQuiet(e.target.checked)} className="h-4 w-4 accent-accent" />
              Cisza nocna
            </label>
            {quiet && (
              <div className="mb-3 flex items-center gap-2 text-[13px] text-ink-2">
                <span>od</span>
                <input inputMode="numeric" value={quietFrom} onChange={(e) => setQuietFrom(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} className="w-14 rounded-field border border-border bg-surface-2 px-2 py-1.5 text-center text-[14px] text-ink outline-none focus:border-accent" aria-label="Cisza od (godzina)" />
                <span>do</span>
                <input inputMode="numeric" value={quietTo} onChange={(e) => setQuietTo(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} className="w-14 rounded-field border border-border bg-surface-2 px-2 py-1.5 text-center text-[14px] text-ink outline-none focus:border-accent" aria-label="Cisza do (godzina)" />
                <span className="text-[11.5px] text-muted">(godziny)</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5">
              {subscribed ? (
                <>
                  <SecondaryButton type="button" onClick={disable} disabled={pending}>Wyłącz na tym urządzeniu</SecondaryButton>
                  <PrimaryButton type="button" onClick={test} disabled={pending}>Wyślij testowe</PrimaryButton>
                </>
              ) : (
                <PrimaryButton type="button" onClick={enable} disabled={pending || denied}>{pending ? "Włączanie…" : "Włącz powiadomienia"}</PrimaryButton>
              )}
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
