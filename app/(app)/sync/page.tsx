"use client";
// app/(app)/sync/page.tsx — Prezentacja stanów online / offline / synchronizacji.
// Wszystkie komunikaty bez języka technicznego (żadnego IndexedDB / SW).
import { PageHeader } from "@/components/layout";
import { SectionCard, SyncBadge, SyncStatusCard, Alert } from "@/components/ui";
import type { SyncState } from "@/lib/types";

const STATES: { state: SyncState; when: string }[] = [
  { state: "online", when: "Jest zasięg, zmiany zapisują się od razu." },
  { state: "offline", when: "Brak zasięgu — pracujesz dalej, dane trafiają na telefon." },
  { state: "pending", when: "Kilka zmian czeka w kolejce na wysyłkę." },
  { state: "syncing", when: "Wróciło połączenie — trwa wysyłanie." },
  { state: "synced", when: "Wszystko wysłane, nic nie wymaga uwagi." },
  { state: "error", when: "Coś poszło nie tak — wymaga jednego dotknięcia." },
];

export default function SyncStatesPage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-6 md:px-8">
      <PageHeader title="Stany połączenia i synchronizacji" subtitle="Użytkownik zawsze wie: czy zapisano lokalnie, czy wysłano na serwer, czy wymagane jest działanie." />

      <div className="mb-5"><Alert tone="info" title="Zasada">Nie pokazujemy nazw technicznych. Zawsze mówimy prostym językiem, co się dzieje z danymi.</Alert></div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {STATES.map(({ state, when }) => (
          <SectionCard key={state} className="p-4">
            <div className="flex items-center justify-between px-4 pt-4">
              <SyncBadge state={state} count={3} />
              <span className="font-mono text-[10px] uppercase text-muted">{state}</span>
            </div>
            <div className="px-4 pb-4 pt-3">
              <SyncStatusCard state={state} />
              <p className="mt-2.5 text-[12px] text-ink-2">{when}</p>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
