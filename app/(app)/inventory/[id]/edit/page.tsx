// app/(app)/inventory/[id]/edit/page.tsx — Edycja pozycji magazynu + egzemplarze + historia (§17).
import { notFound } from "next/navigation";
import { getInventoryItem, listInventoryAudit } from "@/lib/data/inventory";
import { listInstances } from "@/lib/data/instances";
import { InventoryForm } from "../../inventory-form";
import { InventoryAuditList } from "../../audit-list";
import { InstancesManager } from "../../instances-manager";

export const dynamic = "force-dynamic";

export default async function EditInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, audit] = await Promise.all([getInventoryItem(id), listInventoryAudit(id, 30)]);
  if (!item) notFound();
  // §17.2 Egzemplarze tylko dla pozycji ewidencjonowanych jako „konkretny egzemplarz".
  const instances = item.tracking === "INDIVIDUAL" ? await listInstances(id) : [];

  return (
    <>
      <InventoryForm initial={item} />
      <div className="mx-auto max-w-[900px] px-5 pb-10 md:px-8">
        {item.tracking === "INDIVIDUAL" && <InstancesManager equipmentId={id} initialInstances={instances} />}
        <InventoryAuditList entries={audit} />
      </div>
    </>
  );
}
