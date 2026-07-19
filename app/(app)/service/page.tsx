// app/(app)/service/page.tsx — Serwis (§29).
import { PageHeader } from "@/components/layout";
import { listServiceTasks } from "@/lib/data/service";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ServiceManager } from "./service-manager";

export const dynamic = "force-dynamic";

export default async function ServicePage() {
  const tasks = await listServiceTasks();
  const demo = !isSupabaseConfigured();
  const open = tasks.filter((t) => t.status !== "DONE").length;

  return (
    <div className="mx-auto max-w-[980px] px-5 py-6 md:px-8">
      <PageHeader title="Serwis" subtitle={`${open} otwartych zadań · ${tasks.length} łącznie`} />
      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">Tryb demo — dane przykładowe.</div>
      )}
      <ServiceManager tasks={tasks} />
    </div>
  );
}
