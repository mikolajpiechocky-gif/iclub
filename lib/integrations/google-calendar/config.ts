// Konfiguracja integracji Google Calendar (konto usługi, §53). Sekrety w env.
// Bez kompletu zmiennych integracja jest wyłączona (graceful — sync pomijany).
export const GCAL_CLIENT_EMAIL = process.env.GOOGLE_SA_CLIENT_EMAIL;
export const GCAL_PRIVATE_KEY = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, "\n");
export const GCAL_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(GCAL_CLIENT_EMAIL && GCAL_PRIVATE_KEY && GCAL_CALENDAR_ID);
}
