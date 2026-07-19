// app/(app)/inquiries/new/page.tsx — dodawanie zapytania.
import { InquiryForm } from "../inquiry-form";
import { listCustomers } from "@/lib/data/customers";

export const dynamic = "force-dynamic";

export default async function NewInquiryPage() {
  const customers = (await listCustomers()).map((c) => ({ id: c.id, name: c.name }));
  return <InquiryForm customers={customers} />;
}
