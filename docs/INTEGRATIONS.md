# Integracje zewnętrzne

Integracje włączają się **automatycznie po dodaniu klucza** do zmiennych
środowiskowych. Bez klucza aplikacja działa dalej (tryb ręczny / fallback),
bez atrap i bez fikcyjnych sekretów (§40).

---

## Google Maps (dystans i trasy)

Używane API (serwerowo): **Geocoding API** i **Routes API**. Docelowo też
Places Autocomplete i Route Optimization.

### Co robisz Ty (jednorazowo)
1. Wejdź na **https://console.cloud.google.com** → utwórz/wybierz projekt.
2. **APIs & Services → Enable APIs** → włącz:
   - **Geocoding API**
   - **Routes API**
3. **APIs & Services → Credentials → Create credentials → API key**.
4. **Ogranicz klucz** (Restrict key):
   - **API restrictions:** tylko Geocoding API + Routes API.
   - (Zalecane) **Application restrictions:** IP serwera / brak — to klucz serwerowy.
5. **Włącz billing** w projekcie Google Cloud (Maps wymaga; jest darmowy limit miesięczny).
6. Skopiuj klucz i **przekaż mi** albo dodaj samodzielnie.

### Co robię ja
- Dodaję `GOOGLE_MAPS_API_KEY=...` do `.env.local` (lokalnie) — klucz **serwerowy**,
  bez `NEXT_PUBLIC` (nie trafia do przeglądarki).
- Na **Vercel**: Settings → Environment Variables → `GOOGLE_MAPS_API_KEY` (Production) → Redeploy.

### Efekt
- W zleceniu → sekcja **Transport i paliwo** → przycisk **„Oblicz z mapy"**
  wyznacza dystans **baza → adres → baza** i podstawia go do kalkulacji.
- Baza domyślna: `Południowa 9, Dopiewo` (`lib/config/base.ts`, docelowo w ustawieniach).

### Kolejne etapy Google Maps
- Places Autocomplete w polach adresu (klucz przeglądarkowy, osobno ograniczony).
- Route Optimization API (optymalizacja wielu dostaw/odbiorów, §37).
- Zapis `place_id` + współrzędnych przy adresach (§32).

---

## Pozostałe integracje (czekają na decyzję/klucze)

- **InFakt (faktury)** — konto i klucz API InFakt (§43).
- **Push / SMS / e-mail** — wybór dostawcy (np. FCM/OneSignal, Twilio/SMSAPI, Resend) (§8).
- **Google Calendar** — konfiguracja OAuth (§53).

Architektura powstaje modułowo w `lib/integrations/`; sekrety zawsze w zmiennych
środowiskowych, nigdy w repozytorium.
