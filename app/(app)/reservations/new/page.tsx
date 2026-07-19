// app/(app)/reservations/new/page.tsx — nowa rezerwacja iClub.
import { ReservationForm } from "../reservation-form";
import { listCustomers } from "@/lib/data/customers";
import { listTents, listPackages, listAddons } from "@/lib/data/resources";

export const dynamic = "force-dynamic";

export default async function NewReservationPage() {
  const [customers, tents, packages, addons] = await Promise.all([
    listCustomers(),
    listTents(),
    listPackages(),
    listAddons(),
  ]);
  return (
    <ReservationForm
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      tents={tents}
      packages={packages}
      addons={addons}
    />
  );
}
