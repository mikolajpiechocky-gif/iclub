// app/(app)/inventory/tents/new/page.tsx — Nowy namiot w magazynie (§17).
import { TentForm } from "../../tent-form";

export const dynamic = "force-dynamic";

export default function NewTentPage() {
  return <TentForm />;
}
