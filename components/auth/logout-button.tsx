"use client";
// Przycisk wylogowania do użycia poza paskiem bocznym (np. mobilne „Więcej").
// W TRYBIE DEMO pokazuje link do ekranu logowania.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured()) {
    return <Link href="/login" className={className}>Ekran logowania</Link>;
  }

  const logout = async () => {
    setBusy(true);
    try {
      await createClient().auth.signOut();
    } catch {
      // ignoruj — i tak przekierowujemy do logowania
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <button onClick={logout} disabled={busy} className={className}>
      {busy ? "Wylogowywanie…" : "Wyloguj"}
    </button>
  );
}
