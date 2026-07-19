"use client";
// Ekran logowania. Poza shellem aplikacji (bez paska bocznego).
// W TRYBIE DEMO logowanie jest wyłączone — pokazujemy wejście do trybu demo.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Podaj e-mail i hasło.");
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes("invalid")
          ? "Nieprawidłowy e-mail lub hasło."
          : "Nie udało się zalogować. Spróbuj ponownie."
      );
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-7 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-iclub.png" alt="iClub Management" className="h-12 w-auto" />
        </div>

        <div className="rounded-card-lg border border-border bg-surface p-6 shadow-[var(--shadow-pop)]">
          <h1 className="font-display text-[20px] font-bold text-white">Zaloguj się</h1>
          <p className="mt-1 text-[13px] text-ink-2">System operacyjny iClub Management</p>

          {!configured ? (
            <div className="mt-5">
              <div className="rounded-card border border-[#3d3216] bg-[#241e10] p-3.5 text-[12.5px] text-warn">
                Tryb demo: logowanie jest jeszcze nieaktywne, ponieważ Supabase nie
                został skonfigurowany. Możesz przeglądać aplikację na danych
                przykładowych.
              </div>
              <Link
                href="/dashboard"
                className="bg-brand mt-4 flex min-h-[44px] w-full items-center justify-center rounded-field text-[14px] font-bold text-white"
              >
                Wejdź do trybu demo
              </Link>
              <p className="mt-3 text-center text-[11.5px] text-muted">
                Instrukcja włączenia logowania: docs/SUPABASE_SETUP.md
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[12.5px] font-semibold text-ink-2">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ty@iclub.pl"
                  className="min-h-[44px] rounded-field border border-border bg-surface-2 px-3.5 text-[14px] text-ink placeholder:text-muted outline-none transition focus:border-accent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-[12.5px] font-semibold text-ink-2">
                  Hasło
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="min-h-[44px] rounded-field border border-border bg-surface-2 px-3.5 text-[14px] text-ink placeholder:text-muted outline-none transition focus:border-accent"
                />
              </div>

              {error && (
                <div className="rounded-field border border-[#3d1f23] bg-[#251215] px-3.5 py-2.5 text-[12.5px] font-semibold text-bad" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="bg-brand mt-1 flex min-h-[44px] w-full items-center justify-center rounded-field text-[14px] font-bold text-white shadow-[0_6px_18px_rgba(225,29,116,0.4)] transition active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? "Logowanie…" : "Zaloguj się"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-[11.5px] text-muted">
          Konta zakłada właściciel w panelu Supabase — patrz docs/SUPABASE_SETUP.md
        </p>
      </div>
    </div>
  );
}
