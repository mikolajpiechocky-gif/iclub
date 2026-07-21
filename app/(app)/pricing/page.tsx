// app/(app)/pricing/page.tsx — Cennik pakietów i dodatków (§51). Tylko szef.
import { PageHeader } from "@/components/layout";
import { Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listAllPackages, listAddons } from "@/lib/data/resources";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PricingForm } from "./pricing-form";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "OWNER") {
    return (
      <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
        <PageHeader title="Cennik" subtitle="Dostępne dla szefa" />
        <Alert tone="info" title="Brak dostępu">Cennik pakietów i dodatków edytuje tylko szef.</Alert>
      </div>
    );
  }

  const [packages, addons] = await Promise.all([listAllPackages(), listAddons()]);
  const demo = !isSupabaseConfigured();

  return (
    <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
      <PageHeader title="Cennik" subtitle="Ceny pakietów i dodatków — podpowiadane przy rezerwacji" />
      {demo && (
        <div className="mb-4">
          <Alert tone="info" title="Tryb demo">Widzisz dane przykładowe. Po skonfigurowaniu Supabase zmiany będą zapisywane.</Alert>
        </div>
      )}
      <PricingForm packages={packages} addons={addons} disabled={demo} />
    </div>
  );
}
