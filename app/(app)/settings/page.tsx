// app/(app)/settings/page.tsx — Ustawienia aplikacji (§51). Tylko właściciel.
import { PageHeader } from "@/components/layout";
import { Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { getSettings } from "@/lib/data/settings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Ustawienia" subtitle="Dostępne dla właściciela" />
        <Alert tone="info" title="Brak dostępu">Konfigurację cen, bazy i rozliczeń zmienia tylko właściciel.</Alert>
      </div>
    );
  }

  const settings = await getSettings();
  const demo = !isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
      <PageHeader title="Ustawienia" subtitle="Ceny, baza i rozliczenia — bez zaszywania w kodzie" />
      {demo && (
        <div className="mb-4">
          <Alert tone="info" title="Tryb demo">Widzisz wartości domyślne. Po skonfigurowaniu Supabase zmiany będą zapisywane.</Alert>
        </div>
      )}
      <SettingsForm initial={settings} disabled={demo} />
    </div>
  );
}
