// app/(app)/reservations/[id]/edit/page.tsx — edycja rezerwacji.
import { notFound } from "next/navigation";
import { getReservation } from "@/lib/data/reservations";
import { listCustomers } from "@/lib/data/customers";
import { listTents, listPackages, listReservationAddons, getPackage } from "@/lib/data/resources";
import { getSettings } from "@/lib/data/settings";
import { assemblyConfigFromSettings } from "@/lib/domain/assembly";
import { ReservationForm } from "../../reservation-form";

export const dynamic = "force-dynamic";

export default async function EditReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [reservation, customers, tents, packages, addons, settings] = await Promise.all([
    getReservation(id),
    listCustomers(),
    listTents(),
    listPackages(),
    listReservationAddons(),
    getSettings(),
  ]);
  if (!reservation) notFound();
  // §11/#5: dołącz pakiet rezerwacji nawet gdy nieaktywny — inaczej cena/rabat liczyłyby się od 0.
  let allPackages = packages;
  if (reservation.package_id && !packages.some((p) => p.id === reservation.package_id)) {
    const pkg = await getPackage(reservation.package_id);
    if (pkg) allPackages = [...packages, pkg];
  }
  return (
    <ReservationForm
      initial={reservation}
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      tents={tents}
      packages={allPackages}
      addons={addons}
      assemblyConfig={assemblyConfigFromSettings(settings)}
    />
  );
}
