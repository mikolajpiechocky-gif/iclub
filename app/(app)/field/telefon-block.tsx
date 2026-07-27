"use client";
// §II.12 Zadanie „Telefon do klienta" (przed pakowaniem) — krok po kroku z paskiem postępu.
// 6 punktów do potwierdzenia z klientem, każdy z własną funkcją: pakiet, dodatki (dosprzedaż
// z magazynu, premia +15%), sztuczna trawa (tak/nie), godzina montażu + startu, miejsce, podłoże.
// Stan wykonania jest NIEZALEŻNY od potwierdzenia rezerwacji przez Szefa (phone_call_done).
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui";
import { saveClientCallAction } from "./actions";

export interface AddonOption { id: string; name: string; price: number; available: number | null }

const zl = (n: number) => `${Math.round(n).toLocaleString("pl-PL")} zł`;

// Mały pasek postępu (spójny z resztą modułu realizacji).
function Bar({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#262935]">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#8b5cf6,#e11d74)" }} />
    </div>
  );
}

// Karta pojedynczego punktu rozmowy: nagłówek z checkboxem + treść z funkcją kroku.
function Point({ n, title, done, onToggle, children }: { n: number; title: string; done: boolean; onToggle?: () => void; children?: React.ReactNode }) {
  return (
    <div className={`rounded-[11px] border px-3 py-2.5 ${done ? "border-[#1d3a28] bg-[#12271b]" : "border-border bg-surface"}`}>
      <button onClick={onToggle} disabled={!onToggle} className="flex w-full items-center gap-2.5 text-left disabled:cursor-default">
        <span className="flex h-5 w-5 flex-none items-center justify-center rounded-[6px] border-2" style={{ background: done ? "#22c55e" : "transparent", borderColor: done ? "#22c55e" : "#3a3d4a" }}>
          {done && <Icon name="check" className="h-3 w-3 text-[#08170d]" />}
        </span>
        <span className="text-[10px] font-bold text-ink-2">{n}</span>
        <span className="text-[12.5px] font-bold text-ink">{title}</span>
      </button>
      {children && <div className="mt-2 pl-[30px]">{children}</div>}
    </div>
  );
}

export function TelefonBlock({
  reservationId, jobId, packageName, catalog, currentAddonIds, currentAddonQty,
  skipGrass, assemblyTime, eventStartTime, phoneCallDone,
}: {
  reservationId: string;
  jobId: string;
  packageName: string | null;
  catalog: AddonOption[];
  currentAddonIds: string[];
  currentAddonQty: Record<string, number>;
  skipGrass: boolean;
  assemblyTime: string | null;
  eventStartTime: string | null;
  phoneCallDone: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(!phoneCallDone);
  const [asm, setAsm] = useState(assemblyTime ?? "");
  const [start, setStart] = useState(eventStartTime ?? "");
  const [grass, setGrass] = useState(!skipGrass);      // true = bierzemy trawę
  const [grassTouched, setGrassTouched] = useState(phoneCallDone);
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState(""); // §II.9 powód, gdy nie wszystko potwierdzone
  const [err, setErr] = useState<string | null>(null);
  // Ręczne potwierdzenia punktów bez własnej kontrolki.
  const [ok, setOk] = useState<{ pakiet: boolean; dodatki: boolean; miejsce: boolean; podloze: boolean }>(
    () => ({ pakiet: phoneCallDone, dodatki: phoneCallDone, miejsce: phoneCallDone, podloze: phoneCallDone }),
  );

  // Wybrane dodatki: mapa id → ilość (start = to, co na rezerwacji).
  const [selected, setSelected] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const id of currentAddonIds) init[id] = Math.max(1, Math.round(currentAddonQty[id] ?? 1));
    return init;
  });
  const original = useMemo(() => new Set(currentAddonIds), [currentAddonIds]);
  const byId = useMemo(() => new Map(catalog.map((a) => [a.id, a])), [catalog]);

  const chosen = Object.keys(selected);
  const upsell = chosen.filter((id) => !original.has(id)).reduce((s, id) => s + (byId.get(id)?.price ?? 0) * selected[id], 0);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as AddonOption[];
    return catalog.filter((a) => !selected[a.id] && a.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, catalog, selected]);

  const add = (id: string) => { setSelected((s) => ({ ...s, [id]: s[id] ?? 1 })); setQuery(""); };
  const remove = (id: string) => setSelected((s) => { const n = { ...s }; delete n[id]; return n; });
  const setQty = (id: string, q: number) => setSelected((s) => ({ ...s, [id]: Math.max(1, q) }));
  const toggleOk = (k: keyof typeof ok) => setOk((o) => ({ ...o, [k]: !o[k] }));

  // §II.21 Pasek postępu telefonu: 6 punktów.
  const doneFlags = [ok.pakiet, chosen.length > 0 || ok.dodatki, grassTouched, asm.trim().length > 0, ok.miejsce, ok.podloze];
  const doneCount = doneFlags.filter(Boolean).length;
  const allDone = doneCount === 6;
  // §II.9 Zapis wymaga potwierdzenia wszystkich 6 punktów ALBO podania powodu.
  const canFinish = allDone || reason.trim().length >= 3;

  const save = () => {
    if (!canFinish) { setErr("Potwierdź wszystkie punkty albo podaj powód."); return; }
    setErr(null);
    startTransition(async () => {
      const res = await saveClientCallAction(reservationId, jobId, {
        assemblyTime: asm, startTime: start, addonIds: chosen, addonQty: selected, skipGrass: !grass, upsellValue: upsell,
      });
      if (res.ok) { setOpen(false); router.refresh(); }
      else setErr(res.error ?? "Błąd");
    });
  };

  return (
    <div className={`mb-3.5 rounded-[16px] border p-4 ${phoneCallDone ? "border-border bg-surface" : "border-[#3d3216] bg-[#241e10]"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${phoneCallDone ? "bg-[#16301f] text-ok" : "bg-[#332814] text-warn"}`}><Icon name={phoneCallDone ? "check" : "phone"} className="h-4.5 w-4.5" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-ink">Telefon do klienta <span className="text-[11px] font-semibold text-ink-2">· przed pakowaniem</span></div>
          <div className="text-[11.5px] font-medium text-ink-2">{phoneCallDone ? "Telefon wykonany" : `Potwierdź z klientem — ${doneCount}/6`}</div>
        </div>
        {phoneCallDone && <button onClick={() => setOpen((o) => !o)} className="text-[11.5px] font-semibold text-ink-2">{open ? "Zwiń" : "Edytuj"}</button>}
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="rounded-[10px] bg-surface px-3 py-2.5 text-[12.5px] text-ink-2">Zadzwoń, aby potwierdzić pakiet i dodatki. Ustal godzinę, miejsce i podłoże, na jakim będziemy montowali namiot. Dosprzedaż dodatków → premia <b className="text-ink">+15%</b>.</p>

          {/* §II.21 Pasek postępu telefonu */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11.5px] font-semibold"><span className="text-ink-2">Potwierdzenia</span><span className={doneCount >= 6 ? "text-ok" : "text-ink-2"}>{doneCount}/6</span></div>
            <Bar value={doneCount / 6} />
          </div>

          {/* 1. Pakiet */}
          <Point n={1} title="Pakiet" done={ok.pakiet} onToggle={() => toggleOk("pakiet")}>
            <div className="rounded-[9px] border border-border bg-surface-2 px-2.5 py-1.5 text-[12px] font-semibold text-ink">{packageName ?? "—"}</div>
            <div className="mt-1 text-[11px] text-ink-2">Potwierdź z klientem, że zawartość pakietu się zgadza.</div>
          </Point>

          {/* 2. Dodatki + dosprzedaż */}
          <Point n={2} title="Dodatki" done={chosen.length > 0 || ok.dodatki} onToggle={() => toggleOk("dodatki")}>
            {chosen.length === 0 ? (
              <p className="mb-1.5 text-[11.5px] text-ink-2">Brak dodatków — zaproponuj coś z magazynu.</p>
            ) : (
              <div className="mb-1.5 flex flex-col gap-1.5">
                {chosen.map((id) => {
                  const a = byId.get(id);
                  const isUpsell = !original.has(id);
                  return (
                    <div key={id} className="flex items-center gap-2 rounded-[9px] border border-border bg-surface-2 px-2.5 py-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-semibold text-ink">{a?.name ?? "—"}{isUpsell && <span className="ml-1.5 rounded-[6px] bg-[#16301f] px-1.5 py-0.5 text-[10px] font-bold text-ok">dosprzedaż</span>}</div>
                        {a && <div className="text-[11px] text-ink-2">{zl(a.price)} / szt.</div>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(id, selected[id] - 1)} className="h-6 w-6 rounded-[7px] border border-border bg-surface text-[13px] font-bold text-ink-2">−</button>
                        <span className="w-5 text-center text-[12.5px] font-bold text-ink">{selected[id]}</span>
                        <button onClick={() => setQty(id, selected[id] + 1)} className="h-6 w-6 rounded-[7px] border border-border bg-surface text-[13px] font-bold text-ink-2">+</button>
                      </div>
                      <button onClick={() => remove(id)} className="ml-1 text-[11px] font-semibold text-bad">Usuń</button>
                    </div>
                  );
                })}
              </div>
            )}
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Dodaj dodatek z magazynu…" className="w-full rounded-[9px] border border-border bg-surface-2 px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-accent" />
            {results.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-1">
                {results.map((a) => (
                  <button key={a.id} onClick={() => add(a.id)} className="flex items-center gap-2 rounded-[9px] border border-border bg-surface px-2.5 py-1.5 text-left">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold text-ink">{a.name}</div>
                      <div className="text-[11px] text-ink-2">{zl(a.price)}{a.available != null ? ` · ${a.available} w magazynie` : ""}</div>
                    </div>
                    <span className="rounded-[7px] bg-accent px-2 py-1 text-[11px] font-bold text-white">+ Dodaj</span>
                  </button>
                ))}
              </div>
            )}
            {query.trim() && results.length === 0 && <p className="mt-1.5 text-[11px] text-ink-2">Brak pozycji „{query}”.</p>}
            {upsell > 0 && (
              <div className="mt-1.5 flex items-center justify-between rounded-[9px] border border-[#1d3a28] bg-[#12271b] px-2.5 py-1.5 text-[12px]">
                <span className="font-semibold text-ok">Dosprzedaż {zl(upsell)}</span>
                <span className="font-bold text-ok">premia +{zl(upsell * 0.15)}</span>
              </div>
            )}
          </Point>

          {/* 3. Sztuczna trawa */}
          <Point n={3} title="Sztuczna trawa" done={grassTouched}>
            <div className="flex gap-2">
              <button onClick={() => { setGrass(true); setGrassTouched(true); }} className={`flex-1 rounded-[9px] border py-2 text-[12px] font-bold ${grass && grassTouched ? "border-ok bg-[#16301f] text-ok" : "border-border bg-surface-2 text-ink-2"}`}>Tak, bierzemy</button>
              <button onClick={() => { setGrass(false); setGrassTouched(true); }} className={`flex-1 rounded-[9px] border py-2 text-[12px] font-bold ${!grass && grassTouched ? "border-warn bg-[#332814] text-warn" : "border-border bg-surface-2 text-ink-2"}`}>Nie, bez trawy</button>
            </div>
          </Point>

          {/* 4. Godzina montażu + start imprezy */}
          <Point n={4} title="Godzina" done={asm.trim().length > 0}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-24 flex-none text-[12px] font-medium text-ink-2">Montaż</span>
                <input type="time" value={asm} onChange={(e) => setAsm(e.target.value)} className="box-border h-10 min-w-0 flex-1 rounded-[10px] border border-border bg-surface-2 px-3 text-[13px] text-ink outline-none focus:border-accent" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 flex-none text-[12px] font-medium text-ink-2">Start imprezy</span>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="box-border h-10 min-w-0 flex-1 rounded-[10px] border border-border bg-surface-2 px-3 text-[13px] text-ink outline-none focus:border-accent" />
              </div>
            </div>
          </Point>

          {/* 5. Miejsce */}
          <Point n={5} title="Miejsce" done={ok.miejsce} onToggle={() => toggleOk("miejsce")}>
            <div className="text-[11px] text-ink-2">Potwierdź dokładny adres i miejsce ustawienia namiotu.</div>
          </Point>

          {/* 6. Podłoże */}
          <Point n={6} title="Podłoże" done={ok.podloze} onToggle={() => toggleOk("podloze")}>
            <div className="text-[11px] text-ink-2">Ustal podłoże (trawa / kostka / beton) — wpływa na sposób kotwienia.</div>
          </Point>

          {!allDone && (
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={`Nie wszystko potwierdzone (${doneCount}/6) — podaj powód, aby zapisać`} className="w-full rounded-[10px] border border-[#3d3216] bg-[#241e10] px-3 py-2 text-[12.5px] text-ink outline-none focus:border-accent" />
          )}
          {err && <Alert tone="bad" title="Błąd">{err}</Alert>}
          <button onClick={save} disabled={pending || !canFinish} className="w-full rounded-[11px] bg-ok py-2.5 text-[12.5px] font-bold text-[#08170d] disabled:opacity-60">{pending ? "Zapisywanie…" : allDone ? "Telefon wykonany — zapisz" : `Zapisz mimo braków (${doneCount}/6)`}</button>
        </div>
      )}
    </div>
  );
}
