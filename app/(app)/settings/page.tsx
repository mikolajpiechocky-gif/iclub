// app/(app)/settings/page.tsx — Ustawienia aplikacji (§51). Tylko szef.
import { PageHeader } from "@/components/layout";
import { Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { getSettings } from "@/lib/data/settings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOlxIntegration } from "@/lib/data/olx";
import { SettingsForm } from "./settings-form";
import { OlxIntegrationCard } from "./olx-card";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ olx?: string }> }) {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Ustawienia" subtitle="Dostępne dla szefa" />
        <Alert tone="info" title="Brak dostępu">Konfigurację cen, bazy i rozliczeń zmienia tylko szef.</Alert>
      </div>
    );
  }

  const settings = await getSettings();
  const demo = !isSupabaseConfigured();
  const [{ olx: olxStatus }, olxIntegration] = await Promise.all([searchParams, getOlxIntegration()]);

  return (
    <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
      <PageHeader title="Ustawienia" subtitle="Ceny, baza i rozliczenia — bez zaszywania w kodzie" />
      {demo && (
        <div className="mb-4">
          <Alert tone="info" title="Tryb demo">Widzisz wartości domyślne. Po skonfigurowaniu Supabase zmiany będą zapisywane.</Alert>
        </div>
      )}
      {olxStatus === "connected" && <div className="mb-4"><Alert tone="ok" title="OLX połączone">Konto OLX autoryzowane. Kliknij „Synchronizuj rozmowy”, aby zaimportować leady.</Alert></div>}
      {olxStatus === "error" && <div className="mb-4"><Alert tone="bad" title="Nie udało się połączyć z OLX">Spróbuj ponownie „Połącz OLX”.</Alert></div>}
      {olxStatus === "misconfigured" && <div className="mb-4"><Alert tone="warn" title="Brak kluczy OLX">Dodaj OLX_CLIENT_ID i OLX_CLIENT_SECRET w środowisku (Vercel).</Alert></div>}

      <SettingsForm initial={settings} disabled={demo} />

      <OlxIntegrationCard connected={Boolean(olxIntegration?.refresh_token)} lastSyncAt={olxIntegration?.last_sync_at ?? null} />
    </div>
  );
}
