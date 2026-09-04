// Publiczna strona umowy do podpisu (bez logowania). Klient czyta pełną treść, prosi o kod, podpisuje.
// Treść (document_html) to nasza zamrożona migawka — bezpieczna do wstrzyknięcia.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getEsignByToken } from "@/lib/data/esign";
import { SignBox } from "./sign-box";

export const dynamic = "force-dynamic";
// Nie indeksować indywidualnych adresów umów.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const REGULAMIN_URL = process.env.REGULAMIN_URL || "https://iclubevents.pl/regulamin";

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0f1016] px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-5 flex flex-col items-center gap-1.5 text-center">
          <div className="font-display text-[26px] font-black tracking-tight text-white">
            i<span style={{ color: "#e11d74" }}>Club</span>
          </div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#7a8092]">Umowa do podpisu</div>
          <div className="mt-1 h-[3px] w-16 rounded-full" style={{ background: "#e11d74" }} />
        </div>
        {children}
      </div>
    </main>
  );
}

export default async function UmowaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await getEsignByToken(token);

  if (!c) {
    return <Shell><div className="rounded-lg border border-gray-300 bg-white p-6 text-center text-gray-700">Nie znaleziono umowy pod tym adresem. Sprawdź link z wiadomości e-mail.</div></Shell>;
  }

  const expired = Boolean(c.token_expires_at && c.token_expires_at < new Date().toISOString());

  return (
    <Shell>
      <article className="rounded-lg border border-gray-300 bg-white p-6 md:p-8">
        <div dangerouslySetInnerHTML={{ __html: c.document_html || "<p>Treść umowy niedostępna.</p>" }} />
      </article>

      <div className="mt-4">
        {c.status === "signed" ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
            <div className="text-lg font-bold">Umowa zawarta ✓</div>
            <p className="mt-1 text-sm">{c.signed_at ? `Data zawarcia: ${new Date(c.signed_at).toLocaleString("pl-PL")}.` : ""} Potwierdzenie wysłaliśmy na Twój e-mail.</p>
          </div>
        ) : c.status !== "sent" ? (
          <div className="rounded-lg border border-gray-300 bg-white p-4 text-gray-700">Ta umowa nie jest obecnie dostępna do podpisu. Skontaktuj się z iClub.</div>
        ) : expired ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">Link do umowy wygasł. Poproś iClub o nowy.</div>
        ) : (
          <SignBox token={token} regulaminUrl={REGULAMIN_URL} />
        )}
      </div>
    </Shell>
  );
}
