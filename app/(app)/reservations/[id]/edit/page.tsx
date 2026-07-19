// app/(app)/reservations/[id]/edit/page.tsx — edycja rezerwacji.
import { notFound } from "next/navigation";
import { getReservation } from "@/lib/data/reservations";
import { listCustomers } from "@/lib/data/customers";
import { listTents, listPackages, listAddons } from "@/lib/data/resources";
import { ReservationForm } from "../../reservation-form";

export const dynamic = "force-dynamic";

export default async function EditReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [reservation, customers, tents, packages, addons] = await Promise.all([
    getReservation(id),
    listCustomers(),
    listTents(),
    listPackages(),
    listAddons(),
  ]);
  if (!reservation) notFound();
  return (
    <ReservationForm
      initial={reservation}
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
      tents={tents}
      packages={packages}
      addons={addons}
    />
  );
}
