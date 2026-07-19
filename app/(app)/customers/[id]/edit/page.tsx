// app/(app)/customers/[id]/edit/page.tsx — edycja klienta.
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/data/customers";
import { CustomerForm } from "../../customer-form";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();
  return <CustomerForm initial={customer} />;
}
