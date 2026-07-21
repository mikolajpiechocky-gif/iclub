// §17.3 Historia zmian pozycji magazynowej (autor, data, stara → nowa wartość).
import { SectionCard } from "@/components/ui";
import type { InventoryAuditRecord } from "@/lib/data/types";

const ACTION_LABEL: Record<InventoryAuditRecord["action"], string> = {
  create: "Utworzenie",
  update: "Edycja",
  delete: "Wycofanie",
  restore: "Przywrócenie",
};

const fmt = (iso: string) => new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function val(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "tak" : "nie";
  return String(v);
}

export function InventoryAuditList({ entries, title = "Historia zmian" }: { entries: InventoryAuditRecord[]; title?: string }) {
  return (
    <SectionCard title={title} className="mt-4 p-1.5 pb-2">
      {entries.length === 0 ? (
        <p className="px-3.5 py-4 text-[12.5px] text-ink-2">Brak zapisanych zmian dla tej pozycji.</p>
      ) : (
        <div className="flex flex-col">
          {entries.map((e) => (
            <div key={e.id} className="border-b border-border-soft px-3.5 py-3 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold text-ink">{ACTION_LABEL[e.action]}</span>
                <span className="text-[11.5px] text-ink-2">{e.actor_name ?? "—"}</span>
                <span className="ml-auto text-[11px] text-muted">{fmt(e.created_at)}</span>
              </div>
              {e.changes && Object.keys(e.changes).length > 0 && (
                <ul className="mt-1.5 flex flex-col gap-0.5">
                  {Object.entries(e.changes).map(([field, ch]) => (
                    <li key={field} className="text-[11.5px] text-ink-2">
                      <span className="font-semibold text-ink">{field}:</span> {val(ch.old)} → <span className="text-ink">{val(ch.new)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
