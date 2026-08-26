// Pełny wzorzec umowy iClub/NYX Events (wersja pełna: część indywidualna + ogólna w jednym).
// Wypełniany prostym silnikiem typu Mustache: {{pole}}, sekcje {{#blok}}…{{/blok}} (prawda/lista),
// {{^blok}}…{{/blok}} (gdy pusto). Stopka dowodowa NIE jest tu zawarta — dopisuje ją PDF po podpisaniu.

export const CONTRACT_VERSION = "2026-08-pelna";

export const CONTRACT_COMPANY = {
  legalName: "NYX Events Mikołaj Piechocki",
  address: "Brzozowa 31, 88-400 Żnin",
  nip: "5621808563",
  email: "odpalamy@iclubevents.pl",
  bank: "mBank SA, 49 1140 2004 0000 3902 8533 9478",
};

const escHtml = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

type Ctx = Record<string, unknown>;

// Mini-renderer: sekcje (z zagnieżdżaniem przez powtarzane przejścia) + zmienne (escapowane).
export function renderTemplate(tpl: string, data: Ctx): string {
  const sectionRe = /\{\{([#^])\s*([\w.]+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/;
  let out = tpl;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = sectionRe.exec(out)) && guard++ < 5000) {
    const [full, kind, key, inner] = m;
    const val = data[key];
    const truthy = Array.isArray(val) ? val.length > 0 : Boolean(val);
    let replacement = "";
    if (kind === "^") {
      replacement = truthy ? "" : renderTemplate(inner, data);
    } else if (truthy) {
      replacement = Array.isArray(val)
        ? val.map((item) => renderTemplate(inner, { ...data, ...(item && typeof item === "object" ? (item as Ctx) : {}) })).join("")
        : renderTemplate(inner, data);
    }
    out = out.slice(0, m.index) + replacement + out.slice(m.index + full.length);
  }
  return out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
    const v = data[key];
    return v == null || v === "" ? "—" : escHtml(String(v));
  });
}

// Część indywidualna nagłówka + wszystkie paragrafy. Dane firmy/rachunek są stałe (wpisane wprost).
const BODY = `
<section class="umowa">
  <h1 style="font-size:20px;margin:0 0 2px">Umowa świadczenia usług</h1>
  <p style="color:#555;margin:0 0 16px;font-size:13px">nr {{numer_umowy}} · zawarta {{data_zawarcia}} w formie dokumentowej (art. 77² k.c.)</p>

  <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:13px;margin-bottom:16px">
    <div style="min-width:220px">
      <div style="font-weight:700;margin-bottom:2px">Wykonawca</div>
      <div>${CONTRACT_COMPANY.legalName}</div>
      <div>${CONTRACT_COMPANY.address}</div>
      <div>NIP ${CONTRACT_COMPANY.nip}</div>
      <div>${CONTRACT_COMPANY.email}</div>
    </div>
    <div style="min-width:220px">
      <div style="font-weight:700;margin-bottom:2px">Zleceniodawca</div>
      <div>{{imie}} {{nazwisko}}</div>
      {{#firma}}<div>{{nazwa_firmy}}, NIP {{nip}}, {{adres_faktury}}</div>{{/firma}}
      <div>telefon {{telefon}} · e-mail {{email}}</div>
    </div>
  </div>

  <h2 style="font-size:14px;margin:16px 0 4px">§ 2. Przedmiot umowy</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#333">2.1 Wykonawca zobowiązuje się dostarczyć, zamontować, obsłużyć podczas Wydarzenia i odebrać Sprzęt w zakresie Pakietu <b>{{pakiet}}</b> dla namiotu <b>{{namiot}}</b>, a Zleceniodawca zobowiązuje się zapłacić Wynagrodzenie.</p>
  <p style="font-size:12.5px;line-height:1.6;color:#333">2.2 Usługa obejmuje: udostępnienie Sprzętu (§ 3), dostarczenie na Miejsce Wydarzenia i odbiór po zakończeniu, montaż przed rozpoczęciem oraz krótkie szkolenie z obsługi, serwis w czasie wynajmu. 2.3 Wykonawca może realizować część Umowy przez podwykonawców.</p>

  <h2 style="font-size:14px;margin:16px 0 4px">§ 3. Zakres pakietu i wyposażenie dodatkowe</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#333">3.1 Pakiet <b>{{pakiet}}</b> obejmuje:</p>
  <ul style="font-size:12.5px;line-height:1.6;color:#333;margin:2px 0 8px">{{#pozycje_pakietu}}<li>{{pozycja}}</li>{{/pozycje_pakietu}}{{^pozycje_pakietu}}<li>zgodnie z aktualną ofertą pakietu</li>{{/pozycje_pakietu}}</ul>
  <p style="font-size:12.5px;line-height:1.6;color:#333">3.2 Wyposażenie dodatkowe: {{#dodatki}}<br>· {{#ilosc}}{{ilosc}} × {{/ilosc}}{{nazwa_dodatku}}{{#cena_dodatku}} — {{cena_dodatku}}{{/cena_dodatku}}{{/dodatki}}{{^dodatki}} brak{{/dodatki}}</p>
  {{#custom}}<p style="font-size:12.5px;line-height:1.6;color:#333">3.3 Ustalenia indywidualne: {{custom}}</p>{{/custom}}

  <h2 style="font-size:14px;margin:16px 0 4px">§ 4. Termin i miejsce</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#333">4.1 Wydarzenie odbywa się <b>{{data_imprezy}}</b>, orientacyjnie w godzinach {{godzina_startu}}–{{godzina_konca}}. 4.2 Miejsce Wydarzenia: <b>{{adres}}</b>{{#obiekt}}, obiekt: {{obiekt}}{{/obiekt}}.</p>
  <p style="font-size:12.5px;line-height:1.6;color:#333">4.3 Wykonawca dostarcza i montuje Sprzęt {{data_imprezy}} o godzinie <b>{{godzina_dostawy}}</b> (± 30 min). Godzina montażu wynika z Pakietu: STANDARD od 17:00, PREMIUM od 16:00, VIP od 15:00. 4.4 Odbiór Sprzętu do godz. 10:00 dnia następnego. 4.6 Zleceniodawca zapewnia tytuł prawny do miejsca oraz dostęp do prądu 230 V (agregat wykluczony). 4.7 Usługa nie obejmuje sprzątania terenu poza zabraniem Sprzętu.</p>

  <h2 style="font-size:14px;margin:16px 0 4px">§ 5. Wynagrodzenie, zadatek i kaucja</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#333">5.1 Wynagrodzenie za Pakiet: <b>{{cena_pakietu}}</b>. Wyposażenie dodatkowe: {{suma_dodatkow}}. Koszt dojazdu: {{koszt_dojazdu}}. Razem: <b>{{cena_calkowita}}</b>.</p>
  <p style="font-size:12.5px;line-height:1.6;color:#333">5.2 Zadatek: <b>{{zadatek}}</b> — na który składa się opłata rezerwacyjna 300 zł od Pakietu, Koszt dojazdu oraz 15% wartości wyposażenia dodatkowego. Płatny po zawarciu Umowy, w terminie <b>{{termin_zadatku}}</b>. Niewpłacenie Zadatku w terminie może skutkować rozwiązaniem Umowy.</p>
  <p style="font-size:12.5px;line-height:1.6;color:#333">5.3 Pozostała kwota: <b>{{pozostalo}}</b> — płatna gotówką na Miejscu Wydarzenia albo przelewem zaksięgowanym najpóźniej 2 dni przed Wydarzeniem. 5.4 Rachunek Wykonawcy: ${CONTRACT_COMPANY.bank}. BLIK: <b>{{numer_blik}}</b>. 5.5 Zadatek zalicza się na poczet Wynagrodzenia. 5.6 Rezerwacja jest skuteczna z chwilą zawarcia Umowy oraz zaksięgowania Zadatku. 5.7 Kaucja zwrotna: 1000 zł, płatna gotówką w dniu Wydarzenia przed rozłożeniem Sprzętu (§ 9). 5.8 Kwoty w PLN, brutto.</p>

  <h2 style="font-size:14px;margin:16px 0 4px">§ 6. Zmiana terminu i rezygnacja</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#333">6.1 Zmiany i rezygnację zgłasza się na ${CONTRACT_COMPANY.email}. 6.2 Rezerwację można przenieść na inny wolny termin z wykorzystaniem Zadatku — jeden raz. 6.3 Zmiana terminu najpóźniej 14 dni przed Wydarzeniem. 6.4 Zadatek ważny do 31 grudnia roku wpłaty. 6.5 Przy jednostronnej rezygnacji Zadatek nie podlega zwrotowi. 6.6 Przy rozwiązaniu za porozumieniem lub z powodu Siły Wyższej — zwrot w 7 dni roboczych. 6.7 Przy braku współdziałania Wykonawca może rozwiązać Umowę natychmiast po wezwaniu.</p>
  <p style="font-size:12.5px;line-height:1.6;color:#8a1f1f;font-weight:600">6.8 Zleceniodawcy będącemu konsumentem NIE przysługuje prawo odstąpienia od umowy zawartej na odległość — art. 38 ust. 1 pkt 12 ustawy o prawach konsumenta (usługi związane z wydarzeniami rozrywkowymi świadczone w oznaczonym dniu).</p>

  <h2 style="font-size:14px;margin:16px 0 4px">§ 7. Sprzęt</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#333">7.1 Sprzęt pozostaje własnością Wykonawcy/podwykonawców. 7.2 Zleceniodawca przestrzega instrukcji i odpowiada za Osoby Uczestniczące. 7.3 Zabrania się odłączania Sprzętu oraz dmuchawy namiotu od zasilania w trakcie i po Wydarzeniu. 7.4 Szkody/niedobory pokrywa Zleceniodawca (możliwe potrącenie z Kaucji). 7.5 Zleceniodawca zapewnia własny nośnik muzyczny i osobę do obsługi; Wykonawca zapewnia nagłośnienie (Bluetooth/USB; mini jack po zgłoszeniu).</p>

  <h2 style="font-size:14px;margin:16px 0 4px">§ 8. Wizerunek miejsca i materiały promocyjne</h2>
  {{^bez_zdjec}}<p style="font-size:12.5px;line-height:1.6;color:#333">8.1 Zleceniodawca umożliwia Wykonawcy fotografowanie/filmowanie Miejsca Wydarzenia ze Sprzętem oraz wykorzystanie materiałów do reklamy i promocji, chyba że Strony ustalą inaczej.</p>{{/bez_zdjec}}
  {{#bez_zdjec}}<p style="font-size:12.5px;line-height:1.6;color:#333">8.2 Strony ustaliły, że Wykonawca nie wykonuje zdjęć ani nagrań na Miejscu Wydarzenia.</p>{{/bez_zdjec}}

  <h2 style="font-size:14px;margin:16px 0 4px">§ 9. Kaucja</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#333">9.1 Kaucja 1000 zł, płatna w dniu Wydarzenia przed rozłożeniem Sprzętu. 9.2 Po Wydarzeniu rozliczana i zwracana, o ile nie stwierdzono uszkodzeń przekraczających tę kwotę. 9.3 Różnicę ponad Kaucję Zleceniodawca reguluje na pierwsze żądanie. 9.4 Koszt profesjonalnego czyszczenia potrącany z Kaucji. 9.5 Samodzielne odłączenie dmuchawy/Sprzętu (wbrew 7.3) — Kaucja nie podlega zwrotowi.</p>

  <h2 style="font-size:14px;margin:16px 0 4px">§ 10. Odpowiedzialność i bezpieczeństwo</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#333">10.1–10.3 Zleceniodawca odpowiada za szkody Osób Uczestniczących, nieprawidłowe korzystanie ze Sprzętu oraz koszty naprawy i straty Wykonawcy. 10.4 Wykonawca nie odpowiada za utratę przedmiotów wniesionych. 10.6 Odpowiedzialność Wykonawcy ograniczona do naruszenia podstawowych obowiązków i szkód typowych, możliwych do przewidzenia (nie dotyczy winy umyślnej/rażącego niedbalstwa). 10.7 Stały nadzór dorosłych nad dziećmi; dzieci bez dostępu do dmuchawy. 10.8–10.9 Przy awarii/utracie stabilności/przerwie w prądzie — bezpieczne opuszczenie namiotu i odłączenie głównego kabla od sieci. 10.10 Odpowiedzialność wyłącznie za zawinione działania; nie obejmuje awarii dmuchawy z przyczyn niezależnych (odpowiada Wykonawca).</p>

  <h2 style="font-size:14px;margin:16px 0 4px">§ 11. Siła wyższa</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#333">11.1 Żadna Strona nie odpowiada za niewykonanie z powodu Siły Wyższej (katastrofy, zarządzenia władz, wojna, silny wiatr, burza, śnieg). 11.2 Możliwość odstąpienia w 5 dni; Zadatek podlega zwrotowi, bez roszczeń odszkodowawczych. 11.3 Przy nagłym pogorszeniu pogody po dostarczeniu Sprzętu — Zleceniodawca ponosi tylko Koszt dojazdu, Zadatek zwracany.</p>

  <h2 style="font-size:14px;margin:16px 0 4px">§ 12. Reklamacje</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#333">12.1 Reklamacje na ${CONTRACT_COMPANY.email} lub listownie. 12.2 Powinny zawierać opis i uzasadnienie. 12.3 Rozpatrzenie w 14 dni od wyjaśnienia; procedura do 30 dni od doręczenia.</p>

  <h2 style="font-size:14px;margin:16px 0 4px">§ 13. Ochrona danych osobowych</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#333">13.1 Administrator: Mikołaj Piechocki (NYX Events Mikołaj Piechocki, ${CONTRACT_COMPANY.address}, NIP ${CONTRACT_COMPANY.nip}). 13.2 Cel: zawarcie i wykonanie Umowy (art. 6 ust. 1 lit. b), obowiązki prawne (lit. c), uzasadniony interes (lit. f). 13.3 W związku z formą dokumentową przetwarzane są: e-mail, adres IP oraz identyfikator przeglądarki (art. 6 ust. 1 lit. f — wykazanie zawarcia Umowy). 13.4 Przechowywanie przez okres wykonania Umowy oraz wymagany przepisami/roszczeniami. 13.5 Prawa: wgląd, sprostowanie, usunięcie, ograniczenie, przenoszenie, sprzeciw, skarga do PUODO. 13.7 Kontakt: ${CONTRACT_COMPANY.email}.</p>

  <h2 style="font-size:14px;margin:16px 0 4px">§ 14. Zawarcie umowy i postanowienia końcowe</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#333">14.1 Umowa zawierana w formie dokumentowej (art. 77² k.c.): Wykonawca udostępnia treść pod indywidualnym adresem, a Zleceniodawca składa oświadczenie przez wpisanie jednorazowego kodu przesłanego na {{email}}. 14.2 Kod jest jednorazowy i ważny przez czas wskazany w wiadomości; jego wpisanie jest równoznaczne z zawarciem Umowy o wyświetlonej treści. 14.3 Wykonawca utrwala: treść dokumentu w chwili akceptacji, datę i godzinę, e-mail, adres IP i identyfikator przeglądarki. 14.4 Po zawarciu Wykonawca przesyła treść w PDF na trwałym nośniku wraz z danymi do zapłaty Zadatku. 14.5 Zmiany wymagają formy pisemnej lub e-mail. 14.7 Prawo polskie; postanowienia nie uchybiają przepisom o ochronie konsumentów.</p>
  {{#uwagi}}<p style="font-size:12.5px;line-height:1.6;color:#333">14.8 Uwagi Zleceniodawcy przyjęte przez Wykonawcę: {{uwagi}}</p>{{/uwagi}}
</section>`;

export interface ContractTemplateData {
  numer_umowy?: string | null;
  data_zawarcia?: string | null;
  imie?: string | null;
  nazwisko?: string | null;
  firma?: boolean;
  nazwa_firmy?: string | null;
  nip?: string | null;
  adres_faktury?: string | null;
  telefon?: string | null;
  email?: string | null;
  pakiet?: string | null;
  namiot?: string | null;
  pozycje_pakietu?: { pozycja: string }[];
  dodatki?: { ilosc?: string | number; nazwa_dodatku: string; cena_dodatku?: string }[];
  custom?: string | null;
  data_imprezy?: string | null;
  godzina_startu?: string | null;
  godzina_konca?: string | null;
  adres?: string | null;
  obiekt?: string | null;
  godzina_dostawy?: string | null;
  cena_pakietu?: string | null;
  suma_dodatkow?: string | null;
  koszt_dojazdu?: string | null;
  cena_calkowita?: string | null;
  zadatek?: string | null;
  termin_zadatku?: string | null;
  pozostalo?: string | null;
  numer_blik?: string | null;
  bez_zdjec?: boolean;
  uwagi?: string | null;
}

export function renderContract(data: ContractTemplateData): string {
  return renderTemplate(BODY, data as Ctx);
}
