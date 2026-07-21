// Synchronizacja rezerwacji → Google Calendar (§53). Apka = źródło prawdy.
// Format wydarzeń wg ustalonych zasad:
//  - iClub: tytuł "{M/D/MD/DD} {Pakiet} - {Miejscowość}", kolor Flaming (jest
//    duży) / Winogrono (same małe), dodatki w opisie.
//  - Wypożyczalnia: tytuł = nazwa sprzętu lub "Wynajem sprzętu" (kilka pozycji),
//    kolor Szałwia; płatność (z góry / przy odbiorze) w opisie.
//  - Godzina dostawy → wydarzenie z godziną; brak → całodniowe.
// Best-effort: błąd kalendarza nigdy nie wywraca zapisu rezerwacji.
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isGoogleCalendarConfigured } from "@/lib/integrations/google-calendar/config";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, type CalendarEvent, type CalDate } from "@/lib/integrations/google-calendar";
import { tentsCode, reservationCalendarTitle } from "@/lib/domain/calendar";

const TZ = "Europe/Warsaw";
const COLOR_GRAPE = "3"; // Winogrono — małe namioty
const COLOR_FLAMINGO = "4"; // Flaming — duży namiot
const COLOR_SAGE = "2"; // Szałwia — wypożyczalnia

// Wydarzenie całodniowe: end.date jest wyłączające → dzień po ostatnim dniu.
function addDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

interface ResRow {
  business_line: string;
  event_date: string | null;
  setup_date: string | null;
  teardown_date: string | null;
  location: string | null;
  guests: number | null;
  price: number | null;
  deposit: number | null;
  status: string;
  gcal_event_id: string | null;
  delivery_time: string | null;
  rental_items: string | null;
  payment_upfront: boolean;
  tent_id: string | null;
  tent_id_2: string | null;
  addon_ids: string[] | null;
  customer: { name: string | null; phone: string | null; city: string | null } | null;
  package: { name: string | null } | null;
}

// allowCreate=true tylko przy ZAKŁADANIU rezerwacji w apce — wtedy wolno utworzyć
// nowe wydarzenie. Przy edycji/anulowaniu allowCreate=false: aktualizujemy tylko
// istniejące wydarzenie, a starych/zaimportowanych (bez gcal_event_id) nie ruszamy.
export async function syncReservationToCalendar(reservationId: string, opts: { allowCreate?: boolean } = {}): Promise<void> {
  const allowCreate = opts.allowCreate ?? false;
  if (!isSupabaseConfigured() || !isGoogleCalendarConfigured()) return;
  const supabase = await createClient();

  const { data } = await supabase
    .from("reservations")
    .select("business_line, event_date, setup_date, teardown_date, location, guests, price, deposit, status, gcal_event_id, delivery_time, rental_items, payment_upfront, tent_id, tent_id_2, addon_ids, customer:customers(name, phone, city), package:packages(name)")
    .eq("id", reservationId)
    .maybeSingle();
  const r = data as ResRow | null;
  if (!r) return;

  // Anulowana / wygasła → usuń wydarzenie (id zerujemy tylko po udanym usunięciu).
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
  const isIclub = r.business_line === "ICLUB";

  // Rozmiary namiotów (1–2) — osobne zapytanie, bez dwuznacznych złączeń FK.
  const tentIds = [r.tent_id, r.tent_id_2].filter((x): x is string => Boolean(x));
  const tentById = new Map<string, { name: string | null; size: string | null }>();
  if (isIclub && tentIds.length) {
    const { data: tents } = await supabase.from("tents").select("id, name, size").in("id", tentIds);
    for (const t of tents ?? []) tentById.set(t.id as string, { name: t.name as string, size: t.size as string });
  }
  const tentList = tentIds.map((id) => tentById.get(id)).filter(Boolean) as { name: string | null; size: string | null }[];

  // ---- Tytuł + kolor ---- (tytuł ze wspólnej reguły domenowej)
  const summary = reservationCalendarTitle({
    businessLine: r.business_line,
    tentSizes: tentList.map((t) => t.size),
    packageName: r.package?.name ?? null,
    location: r.location,
    customerCity: r.customer?.city ?? null,
    customerName: r.customer?.name ?? null,
    rentalItems: r.rental_items,
  });
  const colorId = isIclub
    ? (tentsCode(tentList.map((t) => t.size)).includes("D") ? COLOR_FLAMINGO : COLOR_GRAPE)
    : COLOR_SAGE;

  // ---- Data / godzina ----
  let start: CalDate;
  let end: CalDate;
  if (r.delivery_time && /^\d{1,2}:\d{2}$/.test(r.delivery_time)) {
    const [h, m] = r.delivery_time.split(":").map(Number);
    const startT = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const endH = h >= 23 ? 23 : h + 1;
    const endM = h >= 23 ? 59 : m;
    const endT = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    start = { dateTime: `${startDate}T${startT}:00`, timeZone: TZ };
    end = { dateTime: `${startDate}T${endT}:00`, timeZone: TZ };
  } else {
    start = { date: startDate };
    end = { date: addDay(endInclusive) };
  }

  // ---- Opis ---- (bez adresu, terminu i liczby gości — są w innych miejscach)
  const balance = r.price != null ? r.price - (r.deposit ?? 0) : null;
  const lines: string[] = [];
  if (r.customer?.name) lines.push(`Klient: ${r.customer.name}`);
  if (r.customer?.phone) lines.push(`Tel: ${r.customer.phone}`);
  if (isIclub) {
    const names = tentList.map((t) => t.name).filter(Boolean).join(" + ");
    if (names) lines.push(`Namiot: ${names}`);
    if (r.package?.name) lines.push(`Pakiet: ${r.package.name}`);
    if (r.addon_ids?.length) {
      const { data: addonRows } = await supabase.from("addons").select("id, name").in("id", r.addon_ids);
      const addonNames = (addonRows ?? []).map((a) => a.name as string).filter(Boolean);
      if (addonNames.length) lines.push(`Dodatki: ${addonNames.join(", ")}`);
    }
  } else {
    if (r.rental_items) lines.push(`Sprzęt: ${r.rental_items}`);
    lines.push(`Płatność: ${r.payment_upfront ? "opłacone z góry" : "przy odbiorze"}`);
  }
  if (r.price != null) lines.push(`Wartość: ${r.price} zł`);
  if (r.deposit) lines.push(`Zadatek: ${r.deposit} zł`);
  if (balance != null) lines.push(`Do zapłaty: ${balance} zł`);
  lines.push("— zarządzane przez iClub Management —");

  const event: CalendarEvent = { summary, description: lines.join("\n"), location: r.location ?? "", colorId, start, end };

  try {
    if (r.gcal_event_id) {
      const result = await updateCalendarEvent(r.gcal_event_id, event);
      if (result === "ok") return;
      if (result === "error") return; // błąd przejściowy — nie duplikuj, ponowimy przy edycji
      // result === "gone" — wydarzenie skasowano w kalendarzu.
    }
    // Nowe wydarzenia tylko przy zakładaniu rezerwacji w apce; stare/importowane
    // (bez gcal_event_id) NIE trafiają do kalendarza — nawet przy edycji.
    if (!allowCreate) return;
    const id = await createCalendarEvent(event);
    if (id) await supabase.from("reservations").update({ gcal_event_id: id }).eq("id", reservationId);
  } catch {
    // best-effort — ignorujemy błędy kalendarza
  }
}
