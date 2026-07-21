// Konfiguracja integracji OLX (Partner API). Sekrety wyłącznie ze zmiennych
// środowiskowych — nigdy w repo. Bez kluczy integracja jest nieaktywna.
export const OLX_CLIENT_ID = process.env.OLX_CLIENT_ID;
export const OLX_CLIENT_SECRET = process.env.OLX_CLIENT_SECRET;

export const OLX_SCOPE = "v2 read write";
export const OLX_TOKEN_URL = "https://www.olx.pl/api/open/oauth/token";
export const OLX_AUTHORIZE_URL = "https://www.olx.pl/oauth/authorize/";
export const OLX_API_BASE = "https://www.olx.pl/api/partner";

export function isOlxConfigured(): boolean {
  return Boolean(OLX_CLIENT_ID && OLX_CLIENT_SECRET);
}
