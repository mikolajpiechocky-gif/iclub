"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { SecondaryButton } from "@/components/ui";
import type { NotificationRecord } from "@/lib/data/notifications";
import { markReadAction, markAllReadAction } from "./actions";

const fmt = (iso: string) => new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function NotificationsView({ items }: { items: NotificationRecord[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const hasUnread = items.some((i) => !i.read);

  const readOne = (id: string) => startTransition(async () => { await markReadAction(id); router.refresh(); });
  const readAll = () => startTransition(async () => { await markAllReadAction(); router.refresh(); });

  return (
    <>
      {hasUnread && (
        <div className="mb-3 flex justify-end"><SecondaryButton onClick={readAll} disabled={pending}>Oznacz wszystkie jako przeczytane</SecondaryButton></div>
      )}
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {items.map((n) => {
          const inner = (
            <div className="flex gap-3 border-b border-border-soft px-4 py-3.5 last:border-0" style={{ background: n.read ? "transparent" : "#171922" }}>
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full" style={{ background: n.read ? "#3a3d4a" : "#e11d74" }} />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-bold text-ink">{n.title}</div>
                {n.body && <div className="mt-0.5 text-[12.5px] text-ink-2">{n.body}</div>}
                <div className="mt-1 text-[11px] text-muted">{fmt(n.created_at)}</div>
              </div>
              {!n.read && <button onClick={(e) => { e.preventDefault(); readOne(n.id); }} disabled={pending} className="self-center rounded-[9px] border border-border bg-surface-2 px-2.5 py-1.5 text-[11.5px] font-semibold text-ink-2">Przeczytane</button>}
            </div>
          );
          return n.job_id ? <Link key={n.id} href={`/jobs/${n.job_id}`} onClick={() => readOne(n.id)}>{inner}</Link> : <div key={n.id}>{inner}</div>;
        })}
      </div>
    </>
  );
}
