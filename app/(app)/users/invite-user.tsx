"use client";
// Dodanie nowego użytkownika. Po utworzeniu pokazuje jednorazowo hasło tymczasowe
// do przekazania pracownikowi (zmieni je po zalogowaniu). Tylko właściciel.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionCard, TextField, PrimaryButton, Alert } from "@/components/ui";
import { inviteUserAction } from "./actions";

export function InviteUser({ canInvite }: { canInvite: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);

  if (!canInvite) {
    return (
      <SectionCard title="Dodaj użytkownika" className="p-5">
        <div className="px-5 pb-5">
          <Alert tone="info" title="Wymaga klucza service_role">
            Aby dodawać konta z panelu, ustaw na serwerze zmienną <code>SUPABASE_SERVICE_ROLE_KEY</code>. Do tego czasu konta zakładasz w Supabase → Authentication → Users.
          </Alert>
        </div>
      </SectionCard>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreated(null);
    startTransition(async () => {
      const res = await inviteUserAction(email, name);
      if (res.ok) {
        setCreated({ email: res.email ?? email, tempPassword: res.tempPassword ?? "" });
        setEmail("");
        setName("");
        router.refresh();
      } else {
        setError(res.error ?? "Błąd");
      }
    });
  };

  return (
    <SectionCard title="Dodaj użytkownika" className="p-5">
      <div className="px-5 pb-5">
        {error && <div className="mb-3"><Alert tone="bad" title="Nie udało się dodać">{error}</Alert></div>}

        {created && (
          <div className="mb-4">
            <Alert tone="ok" title="Konto utworzone — przekaż te dane pracownikowi">
              <div className="mt-1 rounded-[10px] bg-[#0f2018] px-3 py-2 font-mono text-[13px] text-ink">
                <div>e-mail: <span className="font-bold">{created.email}</span></div>
                <div>hasło tymczasowe: <span className="font-bold">{created.tempPassword}</span></div>
              </div>
              <div className="mt-2 text-[12px]">Zaloguje się tymi danymi i zmieni hasło. To hasło pokazujemy tylko teraz — skopiuj je.</div>
            </Alert>
          </div>
        )}

        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <TextField label="Imię i nazwisko" placeholder="Jan Kowalski" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="E-mail" type="email" placeholder="jan@przyklad.pl" value={email} onChange={(e) => setEmail(e.target.value)} />
          <PrimaryButton type="submit" icon="plus" disabled={pending}>{pending ? "Tworzenie…" : "Utwórz konto"}</PrimaryButton>
        </form>
        <p className="mt-2 text-[12px] text-ink-2">Nowe konto ma rolę <strong>Pracownik</strong> — właściciela nadasz na liście powyżej.</p>
      </div>
    </SectionCard>
  );
}
