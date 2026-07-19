# Pełny zakres produktu iClub Management

Ten dokument to skrócona mapa docelowego zakresu. **Źródłem prawdy** jest plik
[`ICLUB_MANAGEMENT_MASTER_INSTRUCTION.md`](../ICLUB_MANAGEMENT_MASTER_INSTRUCTION.md)
(57 sekcji) w katalogu głównym repozytorium. Budujemy moduł po module — nie
wszystko naraz.

## Obszary systemu

- **Sprzedaż**: klienci, zapytania, rezerwacje (iClub i wypożyczalnia).
- **Realizacja iClub**: pakowanie, montaż, przekazanie/szkolenie klienta,
  rozliczenie, demontaż, powrót, rozpakowanie.
- **Wypożyczalnia**: odbiór osobisty oraz dostawa/odbiór.
- **Zasoby**: namioty i zestawy, sprzęt (ilościowy/indywidualny), magazyn,
  blokady, rentowność sprzętu.
- **Ludzie**: pracownicy, stawki, premie, dostępność, przypisania, rankingi.
- **Kalendarz**: wspólny i osobisty, automatyczne zadania, filtry.
- **Flota i transport**: pojazdy, plany transportowe, koszt paliwa,
  optymalizacja tras (Google Routes/Optimization).
- **Finanse**: przychody, koszty, zysk, marża, płatności, zaliczki, faktury,
  rozdział iClub vs wypożyczalnia.
- **Dokumenty**: umowy (generator, wersjonowanie), faktury (architektura pod InFakt).
- **Serwis**: zadania serwisowe, cykl tygodniowy.
- **Komunikacja**: powiadomienia (in-app, push, e-mail, SMS), potwierdzenie
  klienta 7 dni przed, pogoda.
- **Nadzór**: uprawnienia (OWNER/EMPLOYEE), audyt zmian, konfiguracja.
- **Integracje**: Google Maps, Google Calendar, InFakt, SMS/e-mail/push, pogoda.

## Zasady przekrojowe

- Wszystko konfigurowalne (ceny, stawki, premie, progi, godziny, VAT, paliwo,
  dni dostaw, priorytety) — nie zaszywać w komponentach (§51).
- Rozdział warstw: `lib/data`, `lib/domain`, `lib/services`, `lib/validation`,
  `lib/permissions`, `lib/notifications`, `lib/workflows`, `lib/integrations` (§4).
- Etapy mają własne statusy i historię — nie jeden status na proces (§48).
- Tryb demo jako fallback, dopóki dany moduł nie jest podłączony.

## Kolejność wdrożenia

Patrz [`IMPLEMENTATION_PHASES.md`](IMPLEMENTATION_PHASES.md).
