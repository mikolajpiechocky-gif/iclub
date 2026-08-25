// Wysyłka e-mail przez dostawcę transakcyjnego (Resend REST — bez dodatkowej zależności).
// Aktywna, gdy ustawione RESEND_API_KEY + EMAIL_FROM. Bez tego zwraca { skipped:true }
// i ścieżka podpisu informuje, że poczta nie jest jeszcze podpięta.
// SPF/DKIM/DMARC konfiguruje dostawca — NIE wysyłamy z serwera aplikacji bezpośrednio.

export interface EmailAttachment { filename: string; content: string; } // content = base64
export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}
export interface EmailResult { ok: boolean; messageId?: string; error?: string; skipped?: boolean; }

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { ok: false, skipped: true, error: "Poczta nieskonfigurowana (RESEND_API_KEY/EMAIL_FROM)." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        reply_to: input.replyTo,
        attachments: input.attachments,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}` };
    return { ok: true, messageId: data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Błąd wysyłki e-mail." };
  }
}
