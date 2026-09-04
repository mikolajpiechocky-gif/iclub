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
import { computeOrderPrice, suggestedDeposit } from "@/lib/domain/order-pricing";
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

type AdminClient = ReturnType<typeof createAdminClient>;

export interface InquiryComposition {
  packageId: string | null;
  packageName: string | null;
  packagePrice: number;
  packageItems: { name: string; qty: number }[];   // aktualny skład pakietu (do §3.1 umowy)
  addonIds: string[];
  addonQty: Record<string, number>;
  addonsTotal: number;                              // płatna nadwyżka dodatków ponad pakiet
  addonNames: string[];
}

// Rozwiązuje skład i ceny z konfiguracji leada: pakiet (cena wg wielkości namiotu) + jego skład,
// dodatki (kod → pozycja magazynu/legacy, ilość, płatna nadwyżka). Wspólne dla rezerwacji i umowy.
export async function resolveInquiryComposition(
  s: AdminClient, cfg: InquiryConfig | null, tentMain: string | null, tentExtra: string | null,
): Promise<InquiryComposition> {
  const isBig = [tentMain, tentExtra].some((t) => t === "D" || t === "D_BACKDOOR");
  let packageId: string | null = null, packageName: string | null = null, packagePrice = 0;
  const packageItems: { name: string; qty: number }[] = [];
  const included: Record<string, number> = {};
  if (cfg?.package) {
    const { data: pkgs } = await s.from("packages").select("id, code, name, price_small, price_big, base_price").eq("active", true);
    const target = String(cfg.package).trim().toUpperCase();
    const p = ((pkgs ?? []) as { id: string; code: string | null; name: string | null; price_small: number | null; price_big: number | null; base_price: number | null }[])
      .find((x) => String(x.code ?? "").toUpperCase() === target || String(x.name ?? "").toUpperCase() === target);
    if (p) {
      packageId = p.id; packageName = p.name ?? null;
      packagePrice = Number((isBig ? p.price_big : p.price_small) ?? p.base_price ?? 0) || 0;
      const { data: pi } = await s.from("package_items").select("quantity, equipment:equipment(name)").eq("package_id", p.id);
      for (const it of (pi ?? []) as unknown as { quantity: number | null; equipment: { name: string | null } | null }[]) {
        const qn = Number(it.quantity ?? 0) || 0;
        if (it.equipment?.name) packageItems.push({ name: it.equipment.name, qty: qn });
      }
      // included dla naliczania nadwyżki dodatków — potrzebne equipment_id
      const { data: pi2 } = await s.from("package_items").select("equipment_id, quantity").eq("package_id", p.id);
      for (const it of (pi2 ?? []) as { equipment_id: string; quantity: number | null }[]) included[it.equipment_id] = Number(it.quantity ?? 0) || 0;
    }
  }

  const addonIds: string[] = [];
  const addonQty: Record<string, number> = {};
  const addonNames: string[] = [];
  let addonsTotal = 0;
  const cfgAddons = (cfg?.addons ?? []).filter((a) => a.code || a.name);
  if (cfgAddons.length) {
    // Dopasowanie kodem, a gdy kod z konfiguratora nie pasuje do magazynu (np. „stol_p"/„krz") —
    // dopasowanie po NAZWIE (normalizowanej). Bierzemy pełne katalogi (magazyn + legacy).
    const [{ data: eq }, { data: leg }] = await Promise.all([
      s.from("equipment").select("id, code, name, rental_price").eq("active", true),
      s.from("addons").select("id, code, name, price").eq("active", true),
    ]);
    const norm = (x: string | null | undefined) => (x ?? "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
    interface Cand { id: string; price: number; name: string; code: string; nname: string }
    const cands: Cand[] = [];
    for (const a of (leg ?? []) as { id: string; code: string; name: string | null; price: number | null }[]) cands.push({ id: a.id, price: Number(a.price ?? 0) || 0, name: a.name ?? a.code, code: a.code, nname: norm(a.name) });
    for (const e of (eq ?? []) as { id: string; code: string; name: string | null; rental_price: number | null }[]) cands.push({ id: e.id, price: Number(e.rental_price ?? 0) || 0, name: e.name ?? e.code, code: e.code, nname: norm(e.name) }); // magazyn dokładany po legacy
    const byCode = new Map(cands.map((c) => [c.code, c]));
    for (const a of cfgAddons) {
      const nn = norm(a.name);
      if (/ogrzew|nagrzewnic/.test(nn)) continue; // ogrzewanie to osobna flaga rezerwacji, nie dodatek
      let m: Cand | undefined = a.code ? byCode.get(a.code) : undefined;
      if (!m && nn) m = cands.find((c) => c.nname && c.nname === nn) || cands.find((c) => c.nname && (nn.startsWith(c.nname) || c.nname.startsWith(nn)));
      if (!m || addonIds.includes(m.id)) continue;
      const qty = Math.max(1, Math.round(a.qty ?? 1));
      addonIds.push(m.id); addonQty[m.id] = qty;
      addonNames.push(`${qty > 1 ? `${qty} × ` : ""}${a.name ?? m.name}`);
      addonsTotal += m.price * Math.max(0, qty - (included[m.id] ?? 0)); // płatna tylko nadwyżka ponad pakiet
    }
  }
  return { packageId, packageName, packagePrice, packageItems, addonIds, addonQty, addonsTotal, addonNames };
}

const parseAddonsNote = (s: string | null): { name: string; qty: number }[] =>
  !s ? [] : s.split(",").map((x) => x.trim()).filter(Boolean).map((part) => {
    const m = part.match(/^(.*?)\s*[×x]\s*(\d+)\s*$/i);
    return m ? { name: m[1].trim(), qty: parseInt(m[2], 10) } : { name: part, qty: 1 };
  });

const parseNotesEstimate = (notes: string | null): InquiryConfig["estimate"] => {
  if (!notes) return null;
  const m = notes.match(/warto[sś][cć]\D*(\d+)\D+transport\D*(\d+)[\s\S]*?za(?:datek|liczk\w*)\D*(\d+)\D+pozosta\w*\D*(\d+)/i);
  return m ? { value: +m[1], transport: +m[2], deposit: +m[3], remaining: +m[4] } : null;
};

// Ujednolicona konfiguracja z leada: config_json (nowe leady) albo odtworzona z kolumn/notatki (stare).
export function effectiveConfig(q: Record<string, unknown>): InquiryConfig {
  const cfg = (q.config_json ?? null) as InquiryConfig | null;
  if (cfg) return cfg;
  const notes = (q.notes as string) ?? "";
  return {
    line: "ICLUB",
    package: (q.package_interest as string) || null,
    tentMain: (q.tent_interest as string) || null,
    tentExtra: null,
    addons: parseAddonsNote((q.addons_note as string) || null),
    heating: /Ogrzewanie:\s*tak/i.test(notes),
    eventDate: (q.event_date as string) || null,
    location: (q.location as string) || null,
    guests: (q.guests as number) ?? null,
    eventStartTime: notes.match(/Start imprezy:\s*(.+)/)?.[1]?.trim() || null,
    estimate: parseNotesEstimate(notes),
    contact: {
      name: (q.contact_name as string) || undefined,
      email: (q.contact_email as string) || undefined,
      phone: (q.contact_phone as string) || undefined,
    },
  };
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
  const cfg = effectiveConfig(q);

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

  // Cena wg modelu iClub: wartość = pakiet + dodatki + transport; zadatek = 300 + transport + 15% dodatków.
  const comp = await resolveInquiryComposition(s, cfg, tentMain, tentExtra);
  const { packageId, packagePrice, addonIds, addonQty, addonsTotal } = comp;

  const transport = selfPickup ? 0 : Number(cfg?.estimate?.transport ?? 0) || 0;
  const computedOk = packagePrice > 0 || addonsTotal > 0;
  const computedTotal = computeOrderPrice({ packagePrice, addonsTotal, transportPrice: transport, discountType: "AMOUNT", discountValue: 0 }).total;
  // Umowa (opts.amount*) ma pierwszeństwo (kwota podpisana); inaczej liczymy z rozwiązanych składowych,
  // a gdy nic nie udało się rozwiązać — fallback do orientacyjnej wyceny konfiguratora.
  const price = opts.amountTotal ?? (computedOk ? computedTotal : (cfg?.estimate?.value ?? null));
  const deposit = opts.amountDeposit ?? (computedOk ? suggestedDeposit(transport, addonsTotal) : (cfg?.estimate?.deposit ?? null));

  const insert = {
    business_line: "ICLUB",
    status: "CONFIRMED",
    customer_id: customerId,
    event_type: (q.event_type as string) || (cfg?.package ? `iClub · ${cfg.package}` : "Realizacja iClub"),
    event_date: eventDate,
    location: (cfg?.location as string) || (q.location as string) || null,
    guests: (cfg?.guests as number) ?? (q.guests as number) ?? null,
    tent_main: tentMain, tent_extra: tentExtra, tent_id: tentId, tent_id_2: tentId2,
    package_id: packageId, addon_ids: addonIds, addon_qty: addonQty,
    event_start_time: (cfg?.eventStartTime as string) || null,
    heating: Boolean(cfg?.heating),
    self_pickup: selfPickup,
    // §schema: kolumny deposit/discount są NOT NULL — nigdy nie wstawiamy null (stary lead bez wyceny → 0).
    price, deposit: deposit ?? 0, transport_price: transport ?? 0,
    source: "WEBSITE_FORM",
    client_confirmed: true, client_confirmed_at: now,
    notes: `Utworzona ${opts.noteReason ?? "z zapytania"}. Zweryfikuj pakiet, dodatki i wycenę.`.trim(),
  };
  const { data: rez, error: rErr } = await s.from("reservations").insert(insert).select("id, business_line, event_type, event_date").maybeSingle();
  if (rErr || !rez) { console.error("buildReservationFromInquiry insert:", rErr); throw new Error(rErr ? `Zapis rezerwacji: ${rErr.message}` : "Zapis rezerwacji nie zwrócił wiersza."); }
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
