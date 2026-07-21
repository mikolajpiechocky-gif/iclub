"use client";
// Nagłówkowa wyszukiwarka z podpowiedziami na żywo. Debounce → Server Action;
// dropdown z sugestiami (klik = przejście), klik poza / Esc zamyka.
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { searchAction, type SearchSuggestion } from "@/app/(app)/search/actions";

export function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounce zapytania → Server Action.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setItems([]);
      return;
    }
    const t = setTimeout(() => {
      start(async () => {
        const res = await searchAction(query);
        setItems(res);
        setOpen(true);
      });
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  // Zamknięcie po kliknięciu poza.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };
  const seeAll = () => {
    if (q.trim().length >= 2) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };
  const showQuery = q.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative mx-auto max-w-[760px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          seeAll();
        }}
        className="flex items-center gap-2 rounded-field border border-border bg-surface-2 px-3.5 focus-within:border-accent"
      >
        <Icon name="search" className="h-4.5 w-4.5 flex-none text-ink-2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Szukaj klienta, miejscowości, sprzętu…"
          aria-label="Szukaj"
          className="min-h-[40px] flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
        />
        {pending && <span className="text-[11px] font-semibold text-ink-2">…</span>}
      </form>

      {open && items.length > 0 && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-card border border-border bg-panel p-1.5 shadow-2xl">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                go(it.href);
              }}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition hover:bg-surface-2"
            >
              <span className="flex-none rounded-[7px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-2">{it.group}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-ink">{it.title}</span>
                {it.subtitle && <span className="block truncate text-[11.5px] text-ink-2">{it.subtitle}</span>}
              </span>
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              seeAll();
            }}
            className="mt-1 block w-full rounded-[10px] px-3 py-2 text-center text-[12px] font-bold text-white hover:bg-surface-2"
          >
            Wszystkie wyniki →
          </button>
        </div>
      )}

      {open && items.length === 0 && showQuery && !pending && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 rounded-card border border-border bg-panel p-4 text-center text-[12.5px] text-ink-2 shadow-2xl">
          Brak podpowiedzi dla „{q.trim()}”.
        </div>
      )}
    </div>
  );
}
