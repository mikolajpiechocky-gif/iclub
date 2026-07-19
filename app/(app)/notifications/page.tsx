// app/(app)/notifications/page.tsx — Powiadomienia in-app (§8).
import { PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui";
import { listMyNotifications } from "@/lib/data/notifications";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { NotificationsView } from "./notifications-view";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const items = await listMyNotifications();
  const demo = !isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
      <PageHeader title="Powiadomienia" subtitle={`${items.filter((i) => !i.read).length} nieprzeczytanych`} />
      {demo && (
        <div className="mb-4 flex items-center gap-2 rounded-card border border-[#3d3216] bg-[#241e10] px-4 py-3 text-[12.5px] text-warn">
          Tryb demo — powiadomienia pojawią się po zalogowaniu (np. przy przypisaniu do zlecenia).
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState icon="inbox" title="Brak powiadomień" desc="Powiadomienia (np. o przypisaniu do zlecenia) pojawią się tutaj." />
      ) : (
        <NotificationsView items={items} />
      )}
    </div>
  );
}
