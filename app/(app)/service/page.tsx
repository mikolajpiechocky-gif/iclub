// app/(app)/service/page.tsx — Serwis (§29).
import { PageHeader } from "@/components/layout";
import { listServiceTasks } from "@/lib/data/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ServiceManager } from "./service-manager";

export const dynamic = "force-dynamic";

// §18 Eskalacja: ile dni po terminie jest zadanie (0 = w terminie/przyszłe/bez terminu).
// Pure — „teraz" jako parametr (nie wołamy Date.now() w renderze RSC).
function daysPastDue(due: string | null, now = Date.now()): number {
  if (!due) return 0;
  const today = new Date(now).toISOString().slice(0, 10);
  if (due >= today) return 0;
  return Math.round((new Date(today).getTime() - new Date(due).getTime()) / 86_400_000);
}

export default async function ServicePage() {
  const tasks = await listServiceTasks();
  const demo = !isSupabaseConfigured();
  const open = tasks.filter((t) => t.status !== "DONE").length;

  // Mapa przeterminowania (id → dni po terminie) dla zadań otwartych — do eskalacji i znaczników.
  const overdueDays: Record<string, number> = {};
  for (const t of tasks) {
    if (t.status === "DONE") continue;
    const d = daysPastDue(t.due_date);
    if (d > 0) overdueDays[t.id] = d;
  }
  const overdueCount = Object.keys(overdueDays).length;

  return (
    <div className="mx-auto max-w-[980px] px-5 py-6 md:px-8">
      <PageHeader title="Serwis" subtitle={`${open} otwartych zadań · ${tasks.length} łącznie`} />
      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">Tryb demo — dane przykładowe.</div>
      )}
      {overdueCount > 0 && (
        <div className="mb-4 rounded-card border border-[#3a1c1f] bg-[#251215] px-4 py-3 text-[12.5px] text-bad">
          <span className="font-bold">⚠ {overdueCount} {overdueCount === 1 ? "zadanie przeterminowane" : "zadań przeterminowanych"}</span> — zajmij się nimi w pierwszej kolejności (oznaczone czerwono niżej).
        </div>
      )}
      <ServiceManager tasks={tasks} overdueDays={overdueDays} />
    </div>
  );
}
