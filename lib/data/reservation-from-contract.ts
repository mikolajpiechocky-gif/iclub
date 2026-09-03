// Po zawarciu umowy (podpis kodem e-mail) rezerwacja ma realnie powstać i wejść do kalendarza.
// Dwie ścieżki:
//  1) umowa ze ZLECENIA (rezerwacja już istnieje) → potwierdzamy ją (firm na kalendarzu),
//  2) umowa z ZAPYTANIA (lead z konfiguratora, brak rezerwacji) → zakładamy rezerwację + zlecenie
//     + etapy z danych zapytania i kwot z umowy, zamykamy lead jako wygrany.
// Wszystko przez service_role (podpis jest publiczny, bez sesji). Best-effort: błąd tutaj NIE
// wywraca faktu zawarcia umowy — najwyżej powiadamiamy szefa, by założył rezerwację ręcznie.
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { stagesForReservation } from "@/lib/domain/stages";
import { tentSizeCode } from "@/lib/domain/calendar";
import { sendPushToOwners } from "@/lib/integrations/push";
import type { InquiryConfig } from "@/lib/data/types";

interface TentRow { id: string; size: string | null; has_back_door: boolean; name: string | null }

// Wybór z konfiguratora (M/D/D_BACKDOOR/GASTRO) → konkretny egzemplarz namiotu z magazynu.
function resolveTentId(choice: string | null | undefined, tents: TentRow[]): string | null {
  if (!choice) return null;
  if (choice === "M") return tents.find((t) => tentSizeCode(t.size) === "M")?.id ?? null;
  if (choice === "D") return tents.find((t) => tentSizeCode(t.size) === "D" && !t.has_back_door)?.id ?? tents.find((t) => tentSizeCode(t.size) === "D")?.id ?? null;
  if (choice === "D_BACKDOOR") return tents.find((t) => tentSizeCode(t.size) === "D" && t.has_back_door)?.id ?? null;
  if (choice === "GASTRO") return tents.find((t) => /gastr/i.test(t.name ?? ""))?.id ?? null;
  return null;
}

// Wspólny builder: z zapytania (lead) zakłada rezerwację iClub (CONFIRMED) + zlecenie + etapy,
// zakłada/łączy klienta i zamyka lead jako wygrany. Używany i przez podpis umowy, i przez ręczne
// „Utwórz rezerwację (bez umowy)". Kwoty: override z umowy albo z wyceny konfiguratora.
export interface BuildFromInquiryOpts {
  amountTotal?: number | null;
  amountDeposit?: number | null;
  noteReason?: string;   // np. „po podpisaniu umowy IC-…" albo „z zapytania (bez umowy)"
  pushTitle?: string;
}

export async function buildReservationFromInquiry(inquiryId: string, opts: BuildFromInquiryOpts = {}): Promise<{ reservationId: string; jobId: string | null } | null> {
  if (!isServiceRoleConfigured()) return null;
  const s = createAdminClient();
  const now = new Date().toISOString();

  const { data: inq } = await s.from("inquiries").select("*").eq("id", inquiryId).maybeSingle();
  if (!inq) return null;
  const q = inq as Record<string, unknown>;
  const cfg = (q.config_json ?? null) as InquiryConfig | null;

  // Klient: po e-mailu (istniejący) albo zakładamy nowego z danych kontaktowych leada.
  const email = ((cfg?.contact?.email as string) || (q.contact_email as string) || "").trim() || null;
  const name = ((cfg?.contact?.name as string) || (q.contact_name as string) || "Klient (konfigurator)").trim();
  const phone = ((cfg?.contact?.phone as string) || (q.contact_phone as string) || "").trim() || null;
  let customerId: string | null = null;
  if (email) {
    const { data: ex } = await s.from("customers").select("id").ilike("email", email).limit(1).maybeSingle();
    customerId = (ex as { id: string } | null)?.id ?? null;
  }
  if (!customerId) {
    const { data: nc } = await s.from("customers").insert({ type: "PRIVATE", name, email, phone }).select("id").maybeSingle();
    customerId = (nc as { id: string } | null)?.id ?? null;
  }

  // Namiot: wybór z konfiguratora → egzemplarz (żeby wpis liczył się w kalendarzu i pokazał nazwę).
  const tentMain = cfg?.tentMain ?? null;
  const tentExtra = cfg?.tentExtra ?? null;
  let tentId: string | null = null, tentId2: string | null = null;
  if (tentMain || tentExtra) {
    const { data: tents } = await s.from("tents").select("id, size, has_back_door, name");
    const list = (tents ?? []) as TentRow[];
    tentId = resolveTentId(tentMain, list);
    tentId2 = resolveTentId(tentExtra, list);
  }

  const eventDate = (cfg?.eventDate as string) || (q.event_date as string) || null;
  const selfPickup = Boolean(cfg?.selfPickup);
  const insert = {
    business_line: "ICLUB",
    status: "CONFIRMED",
    customer_id: customerId,
    event_type: (q.event_type as string) || (cfg?.package ? `iClub · ${cfg.package}` : "Realizacja iClub"),
    event_date: eventDate,
    location: (cfg?.location as string) || (q.location as string) || null,
    guests: (cfg?.guests as number) ?? (q.guests as number) ?? null,
    tent_main: tentMain, tent_extra: tentExtra, tent_id: tentId, tent_id_2: tentId2,
    event_start_time: (cfg?.eventStartTime as string) || null,
    heating: Boolean(cfg?.heating),
    self_pickup: selfPickup,
    price: opts.amountTotal ?? cfg?.estimate?.value ?? null,
    deposit: opts.amountDeposit ?? cfg?.estimate?.deposit ?? null,
    transport_price: cfg?.estimate?.transport ?? null,
    source: "WEBSITE_FORM",
    client_confirmed: true, client_confirmed_at: now,
    notes: `Utworzona ${opts.noteReason ?? "z zapytania"}. Zweryfikuj pakiet, dodatki i wycenę.`.trim(),
  };
  const { data: rez, error: rErr } = await s.from("reservations").insert(insert).select("id, business_line, event_type, event_date").maybeSingle();
  if (rErr || !rez) { console.error("buildReservationFromInquiry insert:", rErr); return null; }
  const rr = rez as { id: string; business_line: string; event_type: string | null; event_date: string | null };

  const { data: job } = await s.from("jobs").insert({
    reservation_id: rr.id, business_line: rr.business_line, title: rr.event_type ?? "Zlecenie",
    event_date: rr.event_date, status: "PLANNED",
  }).select("id").maybeSingle();
  const jobId = (job as { id: string } | null)?.id ?? null;
  if (jobId) {
    const stages = stagesForReservation("ICLUB", selfPickup).map((st, i) => ({ job_id: jobId, stage_key: st.key, title: st.title, sort: i }));
    await s.from("job_stages").insert(stages);
  }

  // Zamykamy lead jako wygrany.
  await s.from("inquiries").update({ status: "WON", last_activity_at: now }).eq("id", inquiryId);

  sendPushToOwners({
    title: opts.pushTitle ?? "Rezerwacja z zapytania",
    body: `${name}${eventDate ? ` — ${eventDate}` : ""}. Sprawdź pakiet, dodatki i wycenę.`,
    url: `/reservations/${rr.id}`,
    tag: `inquiry-reservation-${rr.id}`,
  }).catch(() => {});

  return { reservationId: rr.id, jobId };
}

export interface ContractForReservation {
  id: string;
  inquiry_id: string | null;
  reservation_id?: string | null;
  order_no: string | null;
  amount_total: number | null;
  amount_deposit: number | null;
}

export async function materializeReservationFromContract(c: ContractForReservation): Promise<{ created: boolean; confirmed: boolean; reservationId?: string }> {
  if (!isServiceRoleConfigured()) return { created: false, confirmed: false };
  const s = createAdminClient();
  const now = new Date().toISOString();

  // (1) Umowa ze zlecenia — rezerwacja już jest. Podpis = twarde potwierdzenie terminu.
  if (c.reservation_id) {
    await s.from("reservations").update({ status: "CONFIRMED", client_confirmed: true, client_confirmed_at: now }).eq("id", c.reservation_id);
    return { created: false, confirmed: true, reservationId: c.reservation_id };
  }
  if (!c.inquiry_id) return { created: false, confirmed: false };

  // (2) Umowa z zapytania — zakładamy rezerwację. Zabezpieczenie przed dublem: jeśli ta umowa
  // ma już przypiętą rezerwację (np. ponowne wywołanie), nic nie robimy.
  const { data: self } = await s.from("esign_contracts").select("reservation_id").eq("id", c.id).maybeSingle();
  if ((self as { reservation_id: string | null } | null)?.reservation_id) {
    return { created: false, confirmed: true, reservationId: (self as { reservation_id: string }).reservation_id };
  }

  const built = await buildReservationFromInquiry(c.inquiry_id, {
    amountTotal: c.amount_total, amountDeposit: c.amount_deposit,
    noteReason: `po podpisaniu umowy ${c.order_no ?? ""}`.trim(),
    pushTitle: "Rezerwacja z podpisanej umowy",
  });
  if (!built) return { created: false, confirmed: false };

  await s.from("esign_contracts").update({ reservation_id: built.reservationId, job_id: built.jobId }).eq("id", c.id);
  return { created: true, confirmed: true, reservationId: built.reservationId };
}
