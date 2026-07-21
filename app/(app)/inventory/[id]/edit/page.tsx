// app/(app)/inventory/[id]/edit/page.tsx — Edycja pozycji magazynu + historia zmian (§17.3).
import { notFound } from "next/navigation";
import { getInventoryItem, listInventoryAudit } from "@/lib/data/inventory";
import { InventoryForm } from "../../inventory-form";
import { InventoryAuditList } from "../../audit-list";

export const dynamic = "force-dynamic";

export default async function EditInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, audit] = await Promise.all([getInventoryItem(id), listInventoryAudit(id, 30)]);
  if (!item) notFound();

  return (
    <>
      <InventoryForm initial={item} />
      <div className="mx-auto max-w-[900px] px-5 pb-10 md:px-8">
        <InventoryAuditList entries={audit} />
      </div>
    </>
  );
}
