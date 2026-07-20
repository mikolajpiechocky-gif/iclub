// app/(app)/jobs/[id]/page.tsx — dawny szczegół zlecenia.
// Zlecenie zostało scalone z rezerwacją: przekierowujemy do rezerwacji (hub).
import { redirect } from "next/navigation";
import { getJob } from "@/lib/data/jobs";

export const dynamic = "force-dynamic";

export default async function JobRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  redirect(job?.reservation_id ? `/reservations/${job.reservation_id}` : "/reservations");
}
