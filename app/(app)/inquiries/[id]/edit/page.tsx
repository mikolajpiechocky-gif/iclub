// app/(app)/inquiries/[id]/edit/page.tsx — edycja zapytania.
import { notFound } from "next/navigation";
import { getInquiry } from "@/lib/data/inquiries";
import { listCustomers } from "@/lib/data/customers";
import { InquiryForm } from "../../inquiry-form";

export const dynamic = "force-dynamic";

export default async function EditInquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [inquiry, customers] = await Promise.all([getInquiry(id), listCustomers()]);
  if (!inquiry) notFound();
  return (
    <InquiryForm
      initial={inquiry}
      customers={customers.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
