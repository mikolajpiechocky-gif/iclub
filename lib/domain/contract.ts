// Reguły domenowe: generowanie umowy iClub z danych rezerwacji (§44).
// Dane firmy (wynajmujący) i baza są docelowo konfigurowalne (§51).

export const COMPANY = {
  name: "iClub",
  legal: "iClub — dane firmy do uzupełnienia w ustawieniach",
  base: "Południowa 9, Dopiewo",
};

const fmtPLN = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(v);
const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "long", year: "numeric" }) : "—";

export interface ContractInput {
  jobId: string;
  customerName?: string | null;
  customerAddress?: string | null;
  customerTaxId?: string | null;
  customerPhone?: string | null;
  eventType?: string | null;
  eventDate?: string | null;
  setupDate?: string | null;
  teardownDate?: string | null;
  location?: string | null;
  tentName?: string | null;
  packageName?: string | null;
  addonNames?: string[];
  price?: number | null;
  deposit?: number | null;
}

export interface ContractData {
  title: string;
  lessor: string;
  lessee: string;
  sections: { heading: string; body: string }[];
}

export function buildContract(i: ContractInput): ContractData {
  // Pozostało do zapłaty nigdy nie jest ujemne (zadatek nie może przekroczyć wartości).
  const remaining = i.price != null ? Math.max(0, i.price - (i.deposit ?? 0)) : null;
  const addons = (i.addonNames ?? []).join(", ") || "brak";
  const lesseeLine = [
    i.customerName ?? "—",
    i.customerAddress ? `adres: ${i.customerAddress}` : null,
    i.customerTaxId ? `NIP: ${i.customerTaxId}` : null,
    i.customerPhone ? `tel.: ${i.customerPhone}` : null,
  ].filter(Boolean).join(", ");

  return {
    title: `Umowa najmu — ${i.eventType ?? "impreza"}`,
    lessor: `${COMPANY.name} (Wynajmujący), baza: ${COMPANY.base}. ${COMPANY.legal}.`,
    lessee: `${lesseeLine} (Najemca).`,
    sections: [
      {
        heading: "§1. Przedmiot umowy",
        body: `Wynajmujący oddaje Najemcy do używania namiot ${i.tentName ?? "—"} w pakiecie „${i.packageName ?? "—"}". Dodatki: ${addons}. Usługa obejmuje transport, montaż, obsługę techniczną i demontaż zgodnie z ustaleniami.`,
      },
      {
        heading: "§2. Termin i miejsce",
        body: `Data wydarzenia: ${fmtDate(i.eventDate)}. Montaż: ${fmtDate(i.setupDate)}. Demontaż: ${fmtDate(i.teardownDate)}. Lokalizacja: ${i.location ?? "—"}.`,
      },
      {
        heading: "§3. Wynagrodzenie i płatność",
        body: `Wartość umowy (brutto): ${fmtPLN(i.price)}. Zadatek: ${fmtPLN(i.deposit)}. Pozostało do zapłaty: ${fmtPLN(remaining)}. Rozliczenie zgodnie z ustaleniami stron.`,
      },
      {
        heading: "§4. Obowiązki i zakazy",
        body: `Najemca zobowiązuje się do użytkowania sprzętu zgodnie z przeznaczeniem i instrukcją. Zakazuje się: palenia w namiocie, spuszczania powietrza z konstrukcji, samodzielnych napraw oraz przenoszenia sprzętu bez zgody Wynajmującego.`,
      },
      {
        heading: "§5. Odpowiedzialność",
        body: `Najemca ponosi odpowiedzialność za powierzony sprzęt od chwili przekazania do czasu odbioru przez Wynajmującego. Szkody i braki rozliczane są według wartości odtworzeniowej.`,
      },
      {
        heading: "§6. Postanowienia końcowe",
        body: `W sprawach nieuregulowanych stosuje się przepisy Kodeksu cywilnego. Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron.`,
      },
    ],
  };
}
