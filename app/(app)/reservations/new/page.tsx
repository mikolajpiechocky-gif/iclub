// app/(app)/reservations/new/page.tsx — nowa rezerwacja iClub.
import { ReservationForm } from "../reservation-form";
import { listCustomers } from "@/lib/data/customers";
import { listTents, listPackages, listReservationAddons, listAllPackageItems } from "@/lib/data/resources";
import { getSettings } from "@/lib/data/settings";
import { assemblyConfigFromSettings } from "@/lib/domain/assembly";
import { buildPackageComposition } from "@/lib/domain/package-composition";

export const dynamic = "force-dynamic";

export default async function NewReservationPage() {
  const [customers, tents, packages, addons, settings, packageItems] = await Promise.all([
    listCustomers(),
    listTents(),
    listPackages(),
    listReservationAddons(),
    getSettings(),
    listAllPackageItems(),
  ]);
  return (
    <ReservationForm
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      tents={tents}
      packages={packages}
      addons={addons}
      assemblyConfig={assemblyConfigFromSettings(settings)}
      packageComposition={buildPackageComposition(packageItems)}
    />
  );
}
