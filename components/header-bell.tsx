"use client";
// Dzwonek powiadomień w nagłówku: licznik nieprzeczytanych, rozwijany panel,
// przejście do rekordu, oznaczanie jako przeczytane, „Zobacz wszystkie".
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import type { NotificationRecord } from "@/lib/data/notifications";
import { getMyNotificationsAction, markReadAction, markAllReadAction } from "@/app/(app)/notifications/actions";

const fmt = (iso: string) => new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function HeaderBell({ unread = 0 }: { unread?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [count, setCount] = useState(unread);
  const [pending, start] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setCount(unread), [unread]);

  const load = () => start(async () => {
    const list = await getMyNotificationsAction();
    setItems(list);
    setCount(list.filter((n) => !n.read).length);
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const readOne = (id: string) => start(async () => { await markReadAction(id); setItems((xs) => xs.map((n) => (n.id === id ? { ...n, read: true } : n))); setCount((c) => Math.max(0, c - 1)); router.refresh(); });
  const readAll = () => start(async () => { await markAllReadAction(); setItems((xs) => xs.map((n) => ({ ...n, read: true }))); setCount(0); router.refresh(); });

  const shown = items.slice(0, 8);

  return (
    <div ref={boxRef} className="relative flex-none">
      <button onClick={toggle} aria-label="Powiadomienia" className="relative flex h-10 w-10 items-center justify-center rounded-field border border-border bg-surface-2 text-ink-2 transition hover:text-ink">
        <Icon name="bell" className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10.5px] font-bold text-white">{count > 99 ? "99+" : count}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] max-w-[calc(100vw-32px)] overflow-hidden rounded-card border border-border bg-panel shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="text-[13px] font-bold text-white">Powiadomienia</span>
            {count > 0 && <span className="rounded-full bg-[#251215] px-2 py-0.5 text-[11px] font-bold text-accent">{count}</span>}
            {items.some((n) => !n.read) && (
              <button onClick={readAll} disabled={pending} className="ml-auto text-[11.5px] font-semibold text-ink-2 hover:text-ink">Oznacz wszystkie</button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {pending && items.length === 0 && <div className="px-4 py-6 text-center text-[12.5px] text-ink-2">Ładowanie…</div>}
            {!pending && shown.length === 0 && <div className="px-4 py-6 text-center text-[12.5px] text-ink-2">Brak powiadomień.</div>}
            {shown.map((n) => {
              const inner = (
                <div className="flex gap-2.5 px-4 py-3" style={{ background: n.read ? "transparent" : "#171922" }}>
                  <span className="mt-1.5 h-2 w-2 flex-none rounded-full" style={{ background: n.read ? "#3a3d4a" : "#e11d74" }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-ink">{n.title}</div>
                    {n.body && <div className="mt-0.5 truncate text-[12px] text-ink-2">{n.body}</div>}
                    <div className="mt-0.5 text-[10.5px] text-muted">{fmt(n.created_at)}</div>
                  </div>
                </div>
              );
              return n.job_id ? (
                <Link key={n.id} href={`/jobs/${n.job_id}`} onMouseDown={() => { setOpen(false); readOne(n.id); }} className="block border-b border-border-soft last:border-0 hover:bg-surface-2">{inner}</Link>
              ) : (
                <div key={n.id} className="border-b border-border-soft last:border-0">{inner}</div>
              );
            })}
          </div>

          <Link href="/notifications" onMouseDown={() => setOpen(false)} className="block border-t border-border px-4 py-2.5 text-center text-[12.5px] font-bold text-white hover:bg-surface-2">Zobacz wszystkie →</Link>
        </div>
      )}
    </div>
  );
}
