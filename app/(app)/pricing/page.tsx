// app/(app)/pricing/page.tsx — Cennik pakietów i dodatków (§51). Tylko szef.
import { PageHeader } from "@/components/layout";
import { Alert } from "@/components/ui";
import { getCurrentProfile } from "@/lib/data/profiles";
import { listAllPackages, listAddons, listAllPackageItems } from "@/lib/data/resources";
import { listInventory } from "@/lib/data/inventory";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PricingForm } from "./pricing-form";
import { PackageComposition } from "./package-composition";

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

  const [packages, addons, packageItems, inventory] = await Promise.all([listAllPackages(), listAddons(), listAllPackageItems(), listInventory(false)]);
  const demo = !isSupabaseConfigured();
  // §11.1 Skład per pakiet + pozycje magazynowe do wyboru.
  const itemsByPkg = new Map<string, typeof packageItems>();
  for (const it of packageItems) itemsByPkg.set(it.package_id, [...(itemsByPkg.get(it.package_id) ?? []), it]);
  const invChoices = inventory.map((e) => ({ id: e.id, name: e.name, unit: e.unit }));

  return (
    <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
      <PageHeader title="Cennik" subtitle="Ceny pakietów i dodatków — podpowiadane przy rezerwacji" />
      {demo && (
        <div className="mb-4">
          <Alert tone="info" title="Tryb demo">Widzisz dane przykładowe. Po skonfigurowaniu Supabase zmiany będą zapisywane.</Alert>
        </div>
      )}
      <PricingForm packages={packages} addons={addons} disabled={demo} />

      {/* §11.1 Skład pakietów — jakie pozycje magazynowe zawiera każdy pakiet. */}
      <div className="mt-6">
        <h2 className="mb-1 font-display text-[15px] font-bold text-white">Skład pakietów</h2>
        <p className="mb-3 text-[12px] text-ink-2">Pozycje zawarte w pakiecie trafiają na checklistę realizacji. Cena pakietu jest własna — skład nie jest doliczany ponownie.</p>
        <div className="flex flex-col gap-2">
          {packages.map((p) => (
            <PackageComposition key={p.id} packageId={p.id} packageName={p.name} initialItems={itemsByPkg.get(p.id) ?? []} inventory={invChoices} disabled={demo} />
          ))}
        </div>
      </div>
    </div>
  );
}
