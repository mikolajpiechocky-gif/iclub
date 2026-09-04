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

// Część indywidualna nagłówka + wszystkie paragrafy (§1–§14), wierne pełnemu wzorowi.
// Nagłówek wyśrodkowany + marka iClub. Każdy podpunkt w osobnej linii. Dane firmy/rachunek stałe.
const BODY = `
<style>
.umowa{max-width:680px;margin:0 auto;color:#2b2b30;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.62}
.umowa .logoband{background:#14151b;border-radius:14px;padding:16px;text-align:center;margin:0 0 16px}
.umowa .logoband img{height:50px;width:auto;max-width:80%}
.umowa .head{text-align:center;margin:0 0 20px}
.umowa .dtitle{font-size:19px;font-weight:700;margin-top:0;color:#14151b}
.umowa .dsub{color:#6b6f7a;font-size:12px;margin-top:3px}
.umowa .rule{height:3px;width:60px;background:#e11d74;border-radius:3px;margin:13px auto 0}
.umowa .parties{display:flex;gap:32px;justify-content:center;flex-wrap:wrap;text-align:center;margin:0 0 8px}
.umowa .party{min-width:220px}
.umowa .ph{font-weight:700;color:#e11d74;margin-bottom:3px;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}
.umowa h2{font-size:14px;font-weight:700;color:#14151b;margin:22px 0 7px;padding-top:11px;border-top:1px solid #ececef}
.umowa .cl{margin:0 0 6px}
.umowa ul{margin:3px 0 8px;padding-left:20px}
.umowa li{margin:2px 0}
.umowa .warn{color:#8a1f1f;font-weight:600}
.umowa b{color:#14151b}
.umowa .term{font-weight:700;color:#14151b}
</style>
<section class="umowa">
  <div class="logoband"><img src="https://app.iclubevents.pl/logo-iclub.png" alt="iClub"></div>
  <div class="head">
    <div class="dtitle">Umowa świadczenia usług</div>
    <div class="dsub">nr {{numer_umowy}} · {{#data_zawarcia}}zawarta {{data_zawarcia}} {{/data_zawarcia}}w formie dokumentowej (art. 77² k.c.)</div>
    <div class="rule"></div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="ph">Wykonawca</div>
      <div><b>${CONTRACT_COMPANY.legalName}</b></div>
      <div>${CONTRACT_COMPANY.address}</div>
      <div>NIP ${CONTRACT_COMPANY.nip}</div>
      <div>${CONTRACT_COMPANY.email}</div>
    </div>
    <div class="party">
      <div class="ph">Zleceniodawca</div>
      <div><b>{{imie}} {{nazwisko}}</b></div>
      {{#firma}}<div>{{nazwa_firmy}}, NIP {{nip}}, {{adres_faktury}}</div>{{/firma}}
      <div>tel. {{telefon}}</div>
      <div>{{email}}</div>
    </div>
  </div>

  <h2>§ 1. Słownik</h2>
  <p class="cl">Pojęcia pisane wielką literą oznaczają:</p>
  <p class="cl"><span class="term">Kaucja</span> — kwota pobierana przez Wykonawcę na pokrycie ewentualnych szkód lub braków w Sprzęcie (§ 9).</p>
  <p class="cl"><span class="term">Koszt dojazdu</span> — opłata za dojazd na Miejsce Wydarzenia, wskazana w § 5.</p>
  <p class="cl"><span class="term">Miejsce Wydarzenia</span> — miejsce, w którym odbywa się Wydarzenie, wskazane w § 4.</p>
  <p class="cl"><span class="term">Osoby Uczestniczące</span> — wszystkie osoby uczestniczące w Wydarzeniu Zleceniodawcy.</p>
  <p class="cl"><span class="term">Pakiet</span> — wybrany zakres usług, opisany w § 3.</p>
  <p class="cl"><span class="term">Siła Wyższa</span> — zdarzenie o nadzwyczajnym charakterze, któremu nie można zapobiec i które pozostaje poza kontrolą Stron (§ 11).</p>
  <p class="cl"><span class="term">Sprzęt</span> — urządzenia, rzeczy i wyposażenie dostarczane na czas Wydarzenia, w zakresie opisanym w § 3.</p>
  <p class="cl"><span class="term">Wydarzenie</span> — wydarzenie organizowane przez Zleceniodawcę w terminie i miejscu z § 4.</p>
  <p class="cl"><span class="term">Wynagrodzenie</span> — opłata należna Wykonawcy za realizację Umowy (§ 5).</p>
  <p class="cl"><span class="term">Zadatek</span> — kwota płatna po zawarciu Umowy, zaliczana w całości na poczet Wynagrodzenia (art. 394 Kodeksu cywilnego) — § 5.</p>

  <h2>§ 2. Przedmiot umowy</h2>
  <p class="cl">2.1 Wykonawca zobowiązuje się dostarczyć, zamontować, zapewnić wsparcie techniczne podczas Wydarzenia i odebrać Sprzęt w zakresie Pakietu <b>{{pakiet}}</b> dla namiotu <b>{{namiot}}</b>, a Zleceniodawca zobowiązuje się zapłacić Wynagrodzenie.</p>
  <p class="cl">2.2 Usługa obejmuje:</p>
  <ul>
    <li>udostępnienie Sprzętu w zakresie wskazanym w § 3,</li>
    <li>dostarczenie Sprzętu na Miejsce Wydarzenia w terminie z § 4 oraz jego odbiór po zakończeniu Wydarzenia,</li>
    <li>montaż Sprzętu przed rozpoczęciem Wydarzenia oraz krótkie szkolenie z obsługi,</li>
    <li>wsparcie techniczne (serwis) w czasie trwania wynajmu.</li>
  </ul>
  <p class="cl">2.3 Wykonawca może realizować część Umowy przez podwykonawców, na co Zleceniodawca wyraża zgodę.</p>
  <p class="cl">2.4 Pominięcie elementu opisanego wzorcowo w ofercie nie stanowi nienależytego wykonania Umowy, o ile Strony zgodziły się na jego pominięcie.</p>

  <h2>§ 3. Zakres pakietu i wyposażenie dodatkowe</h2>
  <p class="cl">3.1 Pakiet <b>{{pakiet}}</b> obejmuje:</p>
  <ul>{{#pozycje_pakietu}}<li>{{pozycja}}</li>{{/pozycje_pakietu}}{{^pozycje_pakietu}}<li>zgodnie z aktualną ofertą pakietu</li>{{/pozycje_pakietu}}</ul>
  <p class="cl">3.2 Wyposażenie dodatkowe:</p>
  <ul>{{#dodatki}}<li>{{nazwa_dodatku}}</li>{{/dodatki}}{{^dodatki}}<li>brak</li>{{/dodatki}}</ul>
  {{#custom}}<p class="cl">3.3 Ustalenia indywidualne: {{custom}}</p>{{/custom}}

  <h2>§ 4. Termin i miejsce</h2>
  <p class="cl">4.1 Wydarzenie odbywa się <b>{{data_imprezy}}</b>, orientacyjnie w godzinach {{godzina_startu}}–{{godzina_konca}}.</p>
  <p class="cl">4.2 Miejsce Wydarzenia: <b>{{adres}}</b>{{#obiekt}}, obiekt: {{obiekt}}{{/obiekt}}.</p>
  <p class="cl">4.3 Wykonawca dostarcza i montuje Sprzęt {{data_imprezy}} o godzinie <b>{{godzina_dostawy}}</b>, z tolerancją ± 30 minut na nieprzewidziane sytuacje na trasie. Godzina montażu wynika z Pakietu: STANDARD od 17:00, PREMIUM od 16:00, VIP od 15:00.</p>
  <p class="cl">4.4 Odbiór Sprzętu następuje nie później niż do godziny 10:00 dnia następującego po Wydarzeniu, o ile Strony nie postanowią inaczej.</p>
  <p class="cl">4.5 Zleceniodawca udostępnia Miejsce Wydarzenia w celu montażu w terminie z punktu 4.3 oraz umożliwia Wykonawcy wstęp na teren w celu dostarczenia i odbioru Sprzętu — w razie potrzeby uzyskuje zgodę zarządcy miejsca.</p>
  <p class="cl">4.6 Zleceniodawca zapewnia tytuł prawny do Miejsca Wydarzenia oraz dostęp do prądu 230 V. Podłączenie namiotu do agregatu nie jest możliwe.</p>
  <p class="cl">4.7 Usługa nie obejmuje sprzątania terenu po Wydarzeniu, poza zabraniem Sprzętu.</p>

  <h2>§ 5. Wynagrodzenie, zadatek i kaucja</h2>
  <p class="cl">5.1 Wynagrodzenie za Pakiet: <b>{{cena_pakietu}}</b>. Wyposażenie dodatkowe: <b>{{suma_dodatkow}}</b>. Koszt dojazdu: <b>{{koszt_dojazdu}}</b>. {{#rabat}}Rabat: <b>−{{rabat}}</b>. {{/rabat}}Razem: <b>{{cena_calkowita}}</b>.</p>
  <p class="cl">5.2 Zadatek: <b>{{zadatek}}</b> — na który składa się opłata rezerwacyjna 300 zł od Pakietu, Koszt dojazdu oraz 15% wartości wyposażenia dodatkowego. Płatny po zawarciu Umowy, w terminie <b>{{termin_zadatku}}</b>. Niewpłacenie Zadatku w terminie może skutkować rozwiązaniem Umowy.</p>
  <p class="cl">5.3 Pozostała kwota: <b>{{pozostalo}}</b> — płatna gotówką na Miejscu Wydarzenia w dniu Wydarzenia albo przelewem. Przelew musi zostać zaksięgowany na rachunku Wykonawcy najpóźniej 2 dni przed Wydarzeniem.</p>
  <p class="cl">5.4 Rachunek Wykonawcy: ${CONTRACT_COMPANY.bank}. BLIK: <b>{{numer_blik}}</b>.</p>
  <p class="cl">5.5 Z chwilą wykonania Umowy Zadatek zalicza się na poczet Wynagrodzenia.</p>
  <p class="cl">5.6 Rezerwacja terminu jest skuteczna z chwilą łącznego spełnienia dwóch warunków: zawarcia Umowy oraz zaksięgowania Zadatku.</p>
  <p class="cl">5.7 Kaucja zwrotna: 1000 zł, płatna gotówką w dniu Wydarzenia przed rozłożeniem Sprzętu. Zasady jej rozliczenia określa § 9.</p>
  <p class="cl">5.8 Wszystkie kwoty podane są w złotych polskich, w wartościach brutto.</p>

  <h2>§ 6. Zmiana terminu i rezygnacja</h2>
  <p class="cl">6.1 Zmiany terminu oraz rezygnację Zleceniodawca zgłasza na adres ${CONTRACT_COMPANY.email}.</p>
  <p class="cl">6.2 Zleceniodawca może przenieść rezerwację na inny dostępny termin z wykorzystaniem wpłaconego Zadatku, o ile Wykonawca dysponuje wolnymi terminami. Z tej możliwości można skorzystać jeden raz.</p>
  <p class="cl">6.3 Zmiana terminu może nastąpić najpóźniej na 14 dni przed dniem Wydarzenia.</p>
  <p class="cl">6.4 Zadatek można wykorzystać do 31 grudnia roku kalendarzowego, w którym został wpłacony.</p>
  <p class="cl">6.5 W przypadku jednostronnej rezygnacji Zleceniodawcy przed dniem Wydarzenia Zadatek nie podlega zwrotowi.</p>
  <p class="cl">6.6 W przypadku rozwiązania Umowy za porozumieniem Stron lub z powodu Siły Wyższej Zadatek podlega zwrotowi w terminie 7 dni roboczych od dnia rozwiązania lub odstąpienia.</p>
  <p class="cl">6.7 W razie braku współdziałania Zleceniodawcy uniemożliwiającego wykonanie Umowy Wykonawca może rozwiązać ją w trybie natychmiastowym, po uprzednim wezwaniu Zleceniodawcy do zaprzestania naruszeń.</p>
  <p class="cl warn">6.8 Zleceniodawcy będącemu konsumentem nie przysługuje prawo odstąpienia od umowy zawartej na odległość, zgodnie z art. 38 ust. 1 pkt 12 ustawy o prawach konsumenta (usługi związane z wydarzeniami rozrywkowymi świadczone w oznaczonym dniu).</p>

  <h2>§ 7. Sprzęt</h2>
  <p class="cl">7.1 Sprzęt pozostaje wyłączną własnością Wykonawcy lub jego podwykonawców i po zakończeniu Wydarzenia jest im zwracany.</p>
  <p class="cl">7.2 Zleceniodawca przestrzega instrukcji obsługi Sprzętu i odpowiada za działania Osób Uczestniczących w zakresie korzystania ze Sprzętu.</p>
  <p class="cl">7.3 Zabrania się samodzielnego odłączania Sprzętu oraz dmuchawy namiotu od zasilania w trakcie Wydarzenia i po jego zakończeniu. Po odłączeniu dmuchawy namiot staje się podatny na podmuchy wiatru, a sprzęt zamocowany na jego ścianach może ulec zawilgoceniu.</p>
  <p class="cl">7.4 W razie szkód lub niedoborów w Sprzęcie Zleceniodawca pokrywa ich wartość. Wykonawca może potrącić je z Kaucji.</p>
  <p class="cl">7.5 Zleceniodawca zapewnia własny nośnik muzyczny oraz osobę odpowiedzialną za jego obsługę. Wykonawca zapewnia nagłośnienie i możliwość podłączenia nośnika przez Bluetooth lub USB; chęć skorzystania z połączenia mini jack należy zgłosić z wyprzedzeniem. Wykonawca nie odpowiada za odtwarzanie muzyki ani za treść i jakość materiałów dostarczonych przez Zleceniodawcę.</p>

  <h2>§ 8. Wizerunek miejsca i materiały promocyjne</h2>
  {{^bez_zdjec}}<p class="cl">8.1 Zleceniodawca umożliwia Wykonawcy fotografowanie i filmowanie Miejsca Wydarzenia wraz ze Sprzętem oraz wykorzystanie tych materiałów do celów reklamy i promocji, chyba że Strony ustalą inaczej.</p>{{/bez_zdjec}}
  {{#bez_zdjec}}<p class="cl">8.2 Strony ustaliły, że punkt 8.1 nie ma zastosowania — Wykonawca nie wykonuje zdjęć ani nagrań na Miejscu Wydarzenia.</p>{{/bez_zdjec}}

  <h2>§ 9. Kaucja</h2>
  <p class="cl">9.1 Na zabezpieczenie kosztów ewentualnych szkód lub braków w Sprzęcie Wykonawca pobiera Kaucję w wysokości 1000 zł, płatną w dniu Wydarzenia przed rozłożeniem Sprzętu.</p>
  <p class="cl">9.2 Po zakończeniu Wydarzenia Kaucja zostaje rozliczona i zwrócona, o ile nie stwierdzono uszkodzeń przekraczających tę kwotę.</p>
  <p class="cl">9.3 W przypadku szkód przekraczających wartość Kaucji Zleceniodawca reguluje różnicę na pierwsze żądanie Wykonawcy.</p>
  <p class="cl">9.4 Jeżeli namiot lub inny element Sprzętu zostanie zabrudzony w stopniu wymagającym profesjonalnego czyszczenia, Zleceniodawca zostaje obciążony kosztami czyszczenia, potrącanymi z Kaucji.</p>
  <p class="cl">9.5 W razie samodzielnego odłączenia dmuchawy lub Sprzętu od zasilania, wbrew punktowi 7.3, Kaucja nie podlega zwrotowi.</p>

  <h2>§ 10. Odpowiedzialność i bezpieczeństwo</h2>
  <p class="cl">10.1 Zleceniodawca odpowiada za szkody wyrządzone przez Osoby Uczestniczące, w tym zniszczenia lub niedobory Sprzętu oraz uszkodzenia Miejsca Wydarzenia.</p>
  <p class="cl">10.2 Zleceniodawca odpowiada wobec Wykonawcy i osób trzecich za nieprawidłowe korzystanie ze Sprzętu, w tym za działania i zaniechania Osób Uczestniczących.</p>
  <p class="cl">10.3 W przypadku uszkodzenia Sprzętu Zleceniodawca pokrywa koszty naprawy oraz straty Wykonawcy, w tym wynikające z niemożności realizacji innych umów w tym okresie.</p>
  <p class="cl">10.4 Wykonawca nie odpowiada za utratę przedmiotów wniesionych przez Zleceniodawcę lub Osoby Uczestniczące do Miejsca Wydarzenia.</p>
  <p class="cl">10.5 Wykonawca nie odpowiada za opóźnienie lub nienależyte wykonanie Umowy wynikające z braku współdziałania Zleceniodawcy, w szczególności z nieudostępnienia Miejsca Wydarzenia.</p>
  <p class="cl">10.6 Odpowiedzialność Wykonawcy ograniczona jest do naruszenia podstawowych obowiązków umownych oraz do szkód możliwych do przewidzenia w chwili zawarcia Umowy i typowych dla tego rodzaju stosunków. Ograniczenie nie dotyczy rażącego niedbalstwa ani winy umyślnej.</p>
  <p class="cl">10.7 Zleceniodawca zapewnia stały nadzór osób dorosłych nad dziećmi przebywającymi w namiocie i w jego otoczeniu. Dzieci nie mogą samodzielnie korzystać z namiotu ani mieć dostępu do dmuchawy i innych urządzeń.</p>
  <p class="cl">10.8 W razie awarii dmuchawy, rozdarcia lub uszkodzenia ścian namiotu, utraty stabilności lub spadku ciśnienia, a także przerwy w dostawie energii, Zleceniodawca niezwłocznie informuje Osoby Uczestniczące o konieczności bezpiecznego opuszczenia namiotu.</p>
  <p class="cl">10.9 W sytuacjach z punktu 10.8 Zleceniodawca odłącza główny kabel od sieci elektrycznej, unikając rozpinania instalacji wewnątrz namiotu.</p>
  <p class="cl">10.10 Zleceniodawca odpowiada za szkody wynikające z niewywiązania się z obowiązków z punktów 10.7–10.9 wyłącznie wtedy, gdy wynikają one z zawinionego działania lub zaniechania jego bądź osób pozostających pod jego nadzorem. Odpowiedzialność nie obejmuje awarii z przyczyn niezależnych od Zleceniodawcy, w szczególności nieprawidłowego działania dmuchawy, za które odpowiada Wykonawca.</p>

  <h2>§ 11. Siła wyższa</h2>
  <p class="cl">11.1 Żadna ze Stron nie odpowiada za niewykonanie Umowy spowodowane Siłą Wyższą, w tym katastrofami naturalnymi, zarządzeniami władz, wojną, zamieszkami, atakami terrorystycznymi, strajkami generalnymi, silnym wiatrem, burzą lub śniegiem.</p>
  <p class="cl">11.2 W takiej sytuacji każda ze Stron może odstąpić od Umowy w terminie 5 dni od wystąpienia okoliczności uniemożliwiających przygotowanie lub przeprowadzenie Wydarzenia. Zadatek podlega zwrotowi, a Zleceniodawcy nie przysługują roszczenia odszkodowawcze, w tym żądanie dwukrotności Zadatku.</p>
  <p class="cl">11.3 Jeżeli po dostarczeniu Sprzętu nastąpi nagłe, znaczne pogorszenie warunków pogodowych uniemożliwiające bezpieczny montaż i użytkowanie, Zleceniodawca ponosi wyłącznie Koszt dojazdu, a Zadatek podlega zwrotowi.</p>

  <h2>§ 12. Reklamacje</h2>
  <p class="cl">12.1 Reklamacje należy kierować na adres ${CONTRACT_COMPANY.email} lub listownie na adres siedziby Wykonawcy.</p>
  <p class="cl">12.2 Reklamacja powinna zawierać opis uchybienia oraz jego uzasadnienie.</p>
  <p class="cl">12.3 Wykonawca informuje o wyniku rozpatrzenia reklamacji w terminie 14 dni od wyjaśnienia zgłoszonego zdarzenia. Cała procedura nie powinna trwać dłużej niż 30 dni od doręczenia reklamacji.</p>

  <h2>§ 13. Ochrona danych osobowych</h2>
  <p class="cl">13.1 Administratorem danych osobowych jest Mikołaj Piechocki, prowadzący działalność pod firmą NYX Events Mikołaj Piechocki, ${CONTRACT_COMPANY.address}, NIP ${CONTRACT_COMPANY.nip}.</p>
  <p class="cl">13.2 Dane przetwarzane są w celu zawarcia i wykonania Umowy (art. 6 ust. 1 lit. b RODO), wypełnienia obowiązków prawnych (lit. c) oraz w prawnie uzasadnionym interesie Wykonawcy (lit. f).</p>
  <p class="cl">13.3 W związku z zawarciem Umowy w formie dokumentowej przetwarzane są także: adres e-mail, adres IP oraz identyfikator przeglądarki, z której złożono oświadczenie. Podstawą jest prawnie uzasadniony interes Wykonawcy polegający na możliwości wykazania zawarcia Umowy (art. 6 ust. 1 lit. f RODO).</p>
  <p class="cl">13.4 Dane przechowywane są przez okres niezbędny do wykonania Umowy, a następnie przez czas wymagany przepisami podatkowymi i księgowymi lub konieczny do dochodzenia roszczeń.</p>
  <p class="cl">13.5 Zleceniodawcy przysługuje prawo wglądu, sprostowania, usunięcia, ograniczenia przetwarzania, przenoszenia danych, wniesienia sprzeciwu oraz skargi do Prezesa Urzędu Ochrony Danych Osobowych.</p>
  <p class="cl">13.6 Podanie danych jest dobrowolne, lecz niezbędne do zawarcia i wykonania Umowy.</p>
  <p class="cl">13.7 Kontakt w sprawie danych: ${CONTRACT_COMPANY.email}.</p>

  <h2>§ 14. Zawarcie umowy i postanowienia końcowe</h2>
  <p class="cl">14.1 Umowa zawierana jest w formie dokumentowej (art. 77² Kodeksu cywilnego). Wykonawca udostępnia Zleceniodawcy treść Umowy pod indywidualnym adresem internetowym, a Zleceniodawca składa oświadczenie o jej zawarciu przez wpisanie jednorazowego kodu przesłanego na adres {{email}}. Wykonawca może udostępnić także przesyłanie kodu wiadomością SMS.</p>
  <p class="cl">14.2 Kod jest jednorazowy i ważny przez czas wskazany w wiadomości. Wpisanie kodu jest równoznaczne z zawarciem Umowy o treści wyświetlonej Zleceniodawcy przed jego wpisaniem.</p>
  <p class="cl">14.3 Wykonawca utrwala fakt zawarcia Umowy: treść dokumentu w chwili akceptacji, datę i godzinę, adres e-mail, na który wysłano kod, oraz adres IP i identyfikator przeglądarki Zleceniodawcy. Zapis służy wyłącznie wykazaniu zawarcia Umowy.</p>
  <p class="cl">14.4 Niezwłocznie po zawarciu Umowy Wykonawca przesyła Zleceniodawcy jej treść w postaci pliku PDF na trwałym nośniku, wraz z danymi do zapłaty Zadatku.</p>
  <p class="cl">14.5 Zmiany Umowy wymagają potwierdzenia obu Stron w formie pisemnej lub e-mail pod rygorem nieważności.</p>
  <p class="cl">14.6 Oświadczenie o rozwiązaniu lub odstąpieniu od Umowy może zostać złożone mailowo, pisemnie lub w formie dokumentowej na adres wskazany w Umowie.</p>
  <p class="cl">14.7 W sprawach nieuregulowanych stosuje się przepisy prawa polskiego. Postanowienia Umowy nie uchybiają przepisom o ochronie konsumentów; w razie sprzeczności stosuje się przepisy powszechnie obowiązujące.</p>
  {{#uwagi}}<p class="cl">14.8 Uwagi Zleceniodawcy przyjęte przez Wykonawcę: {{uwagi}}</p>{{/uwagi}}
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
  rabat?: string | null;
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
