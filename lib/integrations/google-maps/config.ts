// Konfiguracja integracji Google Maps (klucz serwerowy, §40).
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export function isGoogleMapsConfigured(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY);
}
