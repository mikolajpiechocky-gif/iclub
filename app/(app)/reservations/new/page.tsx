// app/(app)/reservations/new/page.tsx — nowa rezerwacja iClub.
import { ReservationForm } from "../reservation-form";
import { listCustomers } from "@/lib/data/customers";
import { listTents, listPackages, listReservationAddons } from "@/lib/data/resources";
import { getSettings } from "@/lib/data/settings";
import { assemblyConfigFromSettings } from "@/lib/domain/assembly";

export const dynamic = "force-dynamic";

export default async function NewReservationPage() {
  const [customers, tents, packages, addons, settings] = await Promise.all([
    listCustomers(),
    listTents(),
    listPackages(),
    listReservationAddons(),
    getSettings(),
  ]);
  return (
    <ReservationForm
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      tents={tents}
      packages={packages}
      addons={addons}
      assemblyConfig={assemblyConfigFromSettings(settings)}
    />
  );
}
