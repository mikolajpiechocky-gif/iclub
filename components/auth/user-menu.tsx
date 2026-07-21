"use client";
// Stopka paska bocznego: bieżący użytkownik, rola i wylogowanie.
// W TRYBIE DEMO pokazuje etykietę „Tryb demo" i link do ekranu logowania.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ProfileRecord } from "@/lib/data/types";

const ROLE_LABEL: Record<string, string> = { OWNER: "Szef", EMPLOYEE: "Pracownik" };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function UserMenu({ profile }: { profile: ProfileRecord | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();
  const name = profile?.full_name?.trim() || "Użytkownik";

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
    <div className="mt-auto border-t border-[#1b1d27] px-1 pt-3">
      <div className="flex items-center gap-2.5 px-1.5">
        <span
          className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] text-[12px] font-bold text-white"
          style={{ background: "linear-gradient(135deg,#7c3aed,#e11d74)" }}
        >
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-ink">{name}</div>
          <div className="text-[11px] font-semibold text-ink-2">
            {configured && profile ? ROLE_LABEL[profile.role] : "Tryb demo"}
          </div>
        </div>
      </div>
      {configured ? (
        <button
          onClick={logout}
          disabled={busy}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-surface px-2.5 py-2 text-[12.5px] font-semibold text-ink-2 transition hover:text-ink disabled:opacity-50"
        >
          {busy ? "Wylogowywanie…" : "Wyloguj"}
        </button>
      ) : (
        <Link
          href="/login"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-surface px-2.5 py-2 text-[12.5px] font-semibold text-ink-2 transition hover:text-ink"
        >
          Ekran logowania
        </Link>
      )}
    </div>
  );
}
