// app/(app)/jobs/page.tsx — „Zlecenia” zostały scalone z Rezerwacjami.
// Rezerwacja = realizacja; lista zleceń przekierowuje do rezerwacji.
import { redirect } from "next/navigation";

export default function JobsPage() {
  redirect("/reservations");
}
