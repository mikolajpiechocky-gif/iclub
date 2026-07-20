// Synchronizacja rezerwacji → Google Calendar (§53). Apka jest źródłem prawdy;
// tworzy/aktualizuje wydarzenie i zapisuje gcal_event_id (bez duplikatów).
// Best-effort: błąd kalendarza nigdy nie wywraca zapisu rezerwacji.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isGoogleCalendarConfigured } from "@/lib/integrations/google-calendar/config";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, type CalendarEvent } from "@/lib/integrations/google-calendar";

// Wydarzenie całodniowe: end.date jest wyłączające → dzień po ostatnim dniu.
function addDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

interface ResRow {
  event_type: string | null;
  event_date: string | null;
  setup_date: string | null;
  teardown_date: string | null;
  location: string | null;
  guests: number | null;
  price: number | null;
  status: string;
  gcal_event_id: string | null;
  customer: { name: string | null; phone: string | null } | null;
  tent: { name: string | null } | null;
  package: { name: string | null } | null;
}

export async function syncReservationToCalendar(reservationId: string): Promise<void> {
  if (!isSupabaseConfigured() || !isGoogleCalendarConfigured()) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select("event_type, event_date, setup_date, teardown_date, location, guests, price, status, gcal_event_id, customer:customers(name, phone), tent:tents(name), package:packages(name)")
    .eq("id", reservationId)
    .maybeSingle();
  const r = data as ResRow | null;
  if (!r) return;

  // Anulowana / wygasła rezerwacja → usuń wydarzenie z kalendarza (jeśli było).
  // Zerujemy id tylko po udanym usunięciu, żeby przy błędzie ponowić później.
  if (r.status === "CANCELLED" || r.status === "EXPIRED") {
    if (r.gcal_event_id) {
      const removed = await deleteCalendarEvent(r.gcal_event_id);
      if (removed) await supabase.from("reservations").update({ gcal_event_id: null }).eq("id", reservationId);
    }
    return;
  }

  const startDate = r.setup_date || r.event_date;
  if (!startDate) return; // brak daty — nie tworzymy wydarzenia
  const endInclusive = r.teardown_date || r.event_date || startDate;

  const client = r.customer?.name ?? null;
  const summary = `${client ?? r.event_type ?? "Rezerwacja iClub"}${client && r.event_type ? ` — ${r.event_type}` : ""}`;
  const description = [
    r.package?.name ? `Pakiet: ${r.package.name}` : null,
    r.tent?.name ? `Namiot: ${r.tent.name}` : null,
    r.guests != null ? `Goście: ${r.guests}` : null,
    r.price != null ? `Wartość: ${r.price} zł` : null,
    r.customer?.phone ? `Tel: ${r.customer.phone}` : null,
    "— zarządzane przez iClub Management —",
  ].filter(Boolean).join("\n");

  const event: CalendarEvent = {
    summary,
    description,
    location: r.location ?? "",
    startDate,
    endDateExclusive: addDay(endInclusive),
  };

  try {
    if (r.gcal_event_id) {
      const result = await updateCalendarEvent(r.gcal_event_id, event);
      if (result === "ok") return;
      // Błąd przejściowy — nie twórz nowego (uniknięcie duplikatu), ponowimy później.
      if (result === "error") return;
      // result === "gone" — wydarzenie skasowano w kalendarzu, tworzymy na nowo poniżej.
    }
    const id = await createCalendarEvent(event);
    if (id) await supabase.from("reservations").update({ gcal_event_id: id }).eq("id", reservationId);
  } catch {
    // best-effort — ignorujemy błędy kalendarza
  }
}
