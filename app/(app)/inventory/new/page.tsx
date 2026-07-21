// app/(app)/inventory/new/page.tsx — Nowa pozycja magazynu (§17).
import { InventoryForm } from "../inventory-form";

export const dynamic = "force-dynamic";

export default function NewInventoryPage() {
  return <InventoryForm />;
}
