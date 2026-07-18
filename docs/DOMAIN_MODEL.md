# Wstępny model domenowy

## Cel dokumentu

Nazwać pojęcia potrzebne do dalszej analizy bez projektowania tabel SQL, pól ani ostatecznych relacji.

## Stan obecny

Poniższe elementy są kandydaturami. Granice między nimi mogą się zmienić po analizie procesów.

## Zatwierdzone pojęcia i reguły

- `BusinessLine`: `ICLUB` albo `EQUIPMENT_RENTAL`.
- `User` / `Employee`: użytkownik z rolą `OWNER` albo `EMPLOYEE`; model tożsamości i profilu jest do ustalenia.
- `Customer`, `Inquiry`, `Reservation`: klient, zapytanie i czasowa blokada zasobów. Źródła zapytań obejmują OLX, telefon, formularz WWW, polecenie, Facebook Marketplace i Instagram.
- `Job`: handlowe ustalenia z klientem, zakres, wartość i rozliczenie.
- `Realization`: harmonogram wykonania, potencjalnie wielodniowy.
- `Tent`, `Equipment`, `EquipmentSet`, `Package`, `AddOn`: zasoby i konfigurowalna oferta. Pakiety nie mogą być zaszyte w kodzie.
- `Checklist`, `ChecklistItem`: zadania generowane z namiotu, pakietu, dodatków i charakteru realizacji.
- `Payment`, `Cost`: przepływy finansowe powiązane z linią biznesową i pracą operacyjną.
- `Photo`, `Signature`, `Damage`, `Document`, `Notification`: kandydatury dla późniejszych etapów.

## Zlecenie, realizacja i zadania

Zatwierdzono potrzebę rozróżnienia:

- zlecenia handlowego — co uzgodniono i za jaką kwotę,
- harmonogramu realizacji — kiedy i gdzie przebiegają etapy,
- operacyjnych zadań pracowników — kto i co wykonuje.

Do ustalenia, czy będą to osobne encje, części jednego agregatu czy model mieszany. Rozdzielenie może ułatwić realizacje wielodniowe i wiele etapów, ale zwiększa złożoność MVP.

## Zasoby i stany

Początkowe namioty: `6x8 Blue`, `6x8 Green`, `5.4x5.4 Yellow`. Oferta obejmuje też nagłośnienie, oświetlenie, lasery, dymiarki, sztuczną trawę, pałeczki fluorescencyjne, strefę VIP, karaoke, stoły, krzesła, stoliki koktajlowe, parasole grzewcze i inny sprzęt eventowy. Sprzęt może być śledzony ilościowo albo indywidualnie, przypisany do namiotu lub zestawu albo uniwersalny.

Kandydatury stanów: dostępny, zarezerwowany, przygotowany, załadowany, na realizacji, zwrócony, uszkodzony, w serwisie i brakujący. To kierunek, nie ostateczna maszyna stanów. Do ustalenia, które stany opisują fizyczny zasób, a które wynikają z rezerwacji lub czynności.

## Dostępność i konflikty

- Konflikt twardy: ten sam niepodzielny zasób jest potrzebny w nakładających się przedziałach i nie ma realnego sposobu wykonania obu realizacji.
- Ostrzeżenie logistyczne: terminy nie nakładają się bezpośrednio, ale przygotowanie, transport, montaż, demontaż, powrót, ponowne przygotowanie lub odległość mogą uniemożliwić plan.
- Ryzyko operacyjne: plan jest możliwy, lecz ma niewielki margines, zależy od pracowników, transportu albo innych niepewnych warunków.

Każdy przypadek ostrzega właściciela; możliwość zatwierdzenia pozostaje po jego stronie. Dokładny algorytm i znaczenie „twardego” konfliktu są do ustalenia.

## Wycena, płatności i koszty

Wycena zależy od namiotu, pakietu, transportu, dodatków, sprzętu i ręcznych korekt. Ceny nie są stałymi w kodzie. Zatwierdzona początkowa zawartość pakietów:

- Podstawowy: namiot iClub, montaż, lampy LED, laser RGB, zapachowy dym, serwis podczas wynajmu i koncertowe nagłośnienie.
- Premium: wszystko z Podstawowego oraz parkiet ze sztucznej trawy, laser animacyjny i 50 pałeczek fluorescencyjnych.
- VIP: wszystko z Premium oraz 100 pałeczek fluorescencyjnych, oświetlenie UV, strefa VIP i karaoke.

Zawartość każdego pakietu musi pozostać konfigurowalna bez zmiany kodu.

Płatność musi docelowo rozróżniać plan, zgłoszenie odbioru gotówki przez pracownika, weryfikację właściciela, zaległość, zwrot i częściową wpłatę. Koszt może dotyczyć zlecenia, realizacji, pracownika i linii biznesowej; kategorie początkowe to paliwo, pałeczki fluorescencyjne, szampan, hotel, autostrada, dieta, pracownik i inne.

## Kwestie do uzupełnienia

Do ustalenia: statusy i cykle życia, granice encji, model zasobów ilościowych, wersjonowanie pakietów, przedziały blokowania, uprawnienia do korekty czasu oraz sposób przypisywania kosztu do wielu kontekstów.

## Rozwój iteracyjny

Model zostanie dopracowany po zatwierdzeniu MVP i procesów, przed przygotowaniem schematu bazy.
