// §II.7 Historia zmian (audyt) — lista wpisów aktywności.
import type { ActivityRecord } from "@/lib/data/activity";

const fmtDT = (iso: string) => new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function ActivityList({ entries, title = "Historia zmian" }: { entries: ActivityRecord[]; title?: string }) {
  if (!entries.length) return null;
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-[13px] font-bold text-white">{title}</h2>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {entries.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-border-soft px-4 py-2.5 text-[12px] last:border-0">
            <span className="font-semibold text-ink">{e.action}</span>
            {e.entity_label && <span className="text-ink-2">· {e.entity_label}</span>}
            {e.detail && <span className="truncate text-ink-2">· {e.detail}</span>}
            <span className="ml-auto text-[11px] text-muted">{e.actor_name ?? "—"} · {fmtDT(e.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
