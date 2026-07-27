// Data „dziś" w strefie Europe/Warsaw jako YYYY-MM-DD. Używamy zamiast toISOString() (UTC),
// bo po lokalnej północy (a przed 01:00/02:00 UTC) data UTC to jeszcze „wczoraj" — przez co
// dzisiejsze realizacje znikały z „nadchodzących", a okno weekendu przesuwało się o dzień.
export function warsawTodayISO(): string {
  // en-CA formatuje jako YYYY-MM-DD; timeZone wymusza kalendarz warszawski.
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" });
}
