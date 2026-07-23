// app/(app)/inventory/tents/[id]/edit/page.tsx — Edycja namiotu (§17).
import { notFound } from "next/navigation";
import { getTent } from "@/lib/data/resources";
import { TentForm } from "../../../tent-form";

export const dynamic = "force-dynamic";

export default async function EditTentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tent = await getTent(id);
  if (!tent) notFound();
  return <TentForm initial={tent} />;
}
