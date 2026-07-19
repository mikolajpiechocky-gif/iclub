// app/(app)/vehicles/[id]/edit/page.tsx — edycja pojazdu.
import { notFound } from "next/navigation";
import { getVehicle } from "@/lib/data/vehicles";
import { VehicleForm } from "../../vehicle-form";

export const dynamic = "force-dynamic";

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await getVehicle(id);
  if (!vehicle) notFound();
  return <VehicleForm initial={vehicle} />;
}
