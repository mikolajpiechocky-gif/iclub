// Wykrywanie konfiguracji Supabase.
// Gdy zmienne środowiskowe nie są ustawione, aplikacja działa w TRYBIE DEMO:
// logowanie jest wyłączone, a warstwa danych zwraca dane demonstracyjne.
// Po uzupełnieniu .env.local (patrz .env.example / docs/SUPABASE_SETUP.md)
// automatycznie włącza się logowanie i odczyt/zapis prawdziwych danych.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
