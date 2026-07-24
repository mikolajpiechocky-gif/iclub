"use client";
// §II.12 Zadanie „Telefon do klienta" (przed pakowaniem). Skrypt rozmowy + potwierdzenie
// szczegółów: decyzja o sztucznej trawie (nawet gdy jest w pakiecie), dokładanie dodatków
// z magazynu (dosprzedaż → premia +15%), godzina montażu i startu imprezy.
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui";
import { saveClientCallAction } from "./actions";

export interface AddonOption { id: string; name: string; price: number; available: number | null }

const zl = (n: number) => `${Math.round(n).toLocaleString("pl-PL")} zł`;

// Operacyjne punkty do potwierdzenia w rozmowie (poza tym, co ma własne pole niżej).
const TALK_POINTS = ["Adres i dojazd", "Podłoże pod namiot", "Dostęp do prądu"];

export function TelefonBlock({
  reservationId, jobId, packageName, catalog, currentAddonIds, currentAddonQty,
  skipGrass, assemblyTime, eventStartTime, confirmed,
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
  confirmed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(!confirmed);
  const [asm, setAsm] = useState(assemblyTime ?? "");
  const [start, setStart] = useState(eventStartTime ?? "");
  const [grass, setGrass] = useState(!skipGrass); // true = bierzemy trawę
  const [talk, setTalk] = useState<boolean[]>(TALK_POINTS.map(() => false));
  const [query, setQuery] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // Wybrane dodatki: mapa id → ilość. Start = dodatki już na rezerwacji.
  const [selected, setSelected] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const id of currentAddonIds) init[id] = Math.max(1, Math.round(currentAddonQty[id] ?? 1));
    return init;
  });
  const original = useMemo(() => new Set(currentAddonIds), [currentAddonIds]);
  const byId = useMemo(() => new Map(catalog.map((a) => [a.id, a])), [catalog]);

  const chosen = Object.keys(selected);
  // Dosprzedaż = dodatki dołożone w rozmowie (nie było ich na rezerwacji) → premia 15%.
  const upsell = chosen
    .filter((id) => !original.has(id))
    .reduce((s, id) => s + (byId.get(id)?.price ?? 0) * selected[id], 0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as AddonOption[];
    return catalog.filter((a) => !selected[a.id] && a.name.toLowerCase().includes(q)).slice(0, 8);
  }, [query, catalog, selected]);

  const add = (id: string) => { setSelected((s) => ({ ...s, [id]: s[id] ?? 1 })); setQuery(""); };
  const remove = (id: string) => setSelected((s) => { const n = { ...s }; delete n[id]; return n; });
  const setQty = (id: string, q: number) => setSelected((s) => ({ ...s, [id]: Math.max(1, q) }));

  const save = () => {
    setErr(null);
    startTransition(async () => {
      const res = await saveClientCallAction(reservationId, jobId, {
        assemblyTime: asm, startTime: start,
        addonIds: chosen, addonQty: selected, skipGrass: !grass,
      });
      if (res.ok) { setOpen(false); router.refresh(); }
      else setErr(res.error ?? "Błąd");
    });
  };

  return (
    <div className={`mb-3.5 rounded-[16px] border p-4 ${confirmed ? "border-border bg-surface" : "border-[#3d3216] bg-[#241e10]"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${confirmed ? "bg-[#16301f] text-ok" : "bg-[#332814] text-warn"}`}><Icon name={confirmed ? "check" : "phone"} className="h-4.5 w-4.5" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-ink">Telefon do klienta <span className="text-[11px] font-semibold text-ink-2">· przed pakowaniem</span></div>
          <div className="text-[11.5px] font-medium text-ink-2">{confirmed ? "Potwierdzone z klientem" : "Potwierdź szczegóły z klientem"}</div>
        </div>
        {confirmed && <button onClick={() => setOpen((o) => !o)} className="text-[11.5px] font-semibold text-ink-2">{open ? "Zwiń" : "Edytuj"}</button>}
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <p className="rounded-[10px] bg-surface px-3 py-2.5 text-[12.5px] text-ink-2">Zadzwoń i potwierdź zakres realizacji. Ustal godzinę i miejsce, dopytaj o podłoże i dojazd. Zaproponuj dodatki — dosprzedaż w rozmowie daje premię <b className="text-ink">+15%</b>.</p>

          {/* Pakiet (kontekst) */}
          <div className="flex items-center justify-between rounded-[10px] border border-border bg-surface px-3 py-2.5 text-[12px]">
            <span className="text-ink-2">Pakiet</span><span className="text-right font-semibold text-ink">{packageName ?? "—"}</span>
          </div>

          {/* Sztuczna trawa — decyzja Tak/Nie (czasem klient rezygnuje mimo pakietu) */}
          <div className="rounded-[10px] border border-border bg-surface px-3 py-2.5">
            <div className="mb-2 text-[12px] font-bold text-ink">Sztuczna trawa</div>
            <div className="flex gap-2">
              <button onClick={() => setGrass(true)} className={`flex-1 rounded-[9px] border py-2 text-[12.5px] font-bold ${grass ? "border-ok bg-[#16301f] text-ok" : "border-border bg-surface-2 text-ink-2"}`}>Tak, bierzemy</button>
              <button onClick={() => setGrass(false)} className={`flex-1 rounded-[9px] border py-2 text-[12.5px] font-bold ${!grass ? "border-warn bg-[#332814] text-warn" : "border-border bg-surface-2 text-ink-2"}`}>Nie, bez trawy</button>
            </div>
          </div>

          {/* Dodatki realizacji + dosprzedaż z magazynu */}
          <div className="rounded-[10px] border border-border bg-surface px-3 py-2.5">
            <div className="mb-2 text-[12px] font-bold text-ink">Dodatki realizacji</div>
            {chosen.length === 0 ? (
              <p className="mb-2 text-[11.5px] text-ink-2">Brak dodatków — zaproponuj coś z magazynu poniżej.</p>
            ) : (
              <div className="mb-2 flex flex-col gap-1.5">
                {chosen.map((id) => {
                  const a = byId.get(id);
                  const isUpsell = !original.has(id);
                  return (
                    <div key={id} className="flex items-center gap-2 rounded-[9px] border border-border bg-surface-2 px-2.5 py-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-semibold text-ink">{a?.name ?? "—"}{isUpsell && <span className="ml-1.5 rounded-[6px] bg-[#16301f] px-1.5 py-0.5 text-[10px] font-bold text-ok">dosprzedaż</span>}</div>
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
              <div className="mt-2 flex items-center justify-between rounded-[9px] border border-[#1d3a28] bg-[#12271b] px-2.5 py-1.5 text-[12px]">
                <span className="font-semibold text-ok">Dosprzedaż {zl(upsell)}</span>
                <span className="font-bold text-ok">premia +{zl(upsell * 0.15)}</span>
              </div>
            )}
          </div>

          {/* Godziny */}
          <div className="flex gap-2">
            <label className="flex-1 text-[11px] text-ink-2">Godzina montażu
              <input type="time" value={asm} onChange={(e) => setAsm(e.target.value)} className="mt-0.5 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
            </label>
            <label className="flex-1 text-[11px] text-ink-2">Start imprezy
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-0.5 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" />
            </label>
          </div>

          {/* Operacyjne punkty rozmowy */}
          <div className="flex flex-wrap gap-1.5">
            {TALK_POINTS.map((p, i) => (
              <button key={p} onClick={() => setTalk((c) => c.map((v, j) => (j === i ? !v : v)))} className={`rounded-[8px] border px-2 py-1 text-[11.5px] font-semibold ${talk[i] ? "border-ok bg-[#16301f] text-ok" : "border-border bg-surface text-ink-2"}`}>{talk[i] ? "✓ " : ""}{p}</button>
            ))}
          </div>

          {err && <Alert tone="bad" title="Błąd">{err}</Alert>}
          <button onClick={save} disabled={pending} className="w-full rounded-[11px] bg-ok py-2.5 text-[12.5px] font-bold text-[#08170d] disabled:opacity-60">{pending ? "Zapisywanie…" : "Potwierdzone — zapisz"}</button>
        </div>
      )}
    </div>
  );
}
