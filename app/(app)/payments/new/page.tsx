// app/(app)/payments/new/page.tsx — dodanie płatności.
import { PaymentForm } from "../payment-form";
import { listJobs } from "@/lib/data/jobs";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage() {
  const jobs = (await listJobs()).map((j) => ({
    id: j.id,
    label: `${j.reservation?.customer?.name ?? j.title ?? "Zlecenie"}${j.event_date ? " · " + j.event_date : ""}`,
  }));
  return <PaymentForm jobs={jobs} />;
}
