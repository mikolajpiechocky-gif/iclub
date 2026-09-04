// Markowy szablon e-maili iClub (spójny nagłówek/stopka, tabelkowy layout — bezpieczny w Gmailu/Outlooku).
// Awatar nadawcy w skrzynce (logo obok „iClub") wymaga BIMI (rekord DNS + logo SVG + certyfikat VMC) —
// to osobna konfiguracja u dostawcy poczty; sam HTML poniżej zapewnia spójny, iClubowy wygląd treści.

const BRAND = "#e11d74";
const INK = "#14151b";

export interface EmailShellOpts {
  preheader?: string;                 // ukryty podgląd na liście maili
  heading: string;                    // duży tytuł w treści
  intro?: string;                     // akapit wstępny
  bodyHtml?: string;                  // dodatkowa treść HTML
  cta?: { label: string; url: string };
  footerNote?: string;
}

const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));

// Kompletny dokument HTML maila iClub.
export function emailShell(o: EmailShellOpts): string {
  const pre = o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}</div>` : "";
  const cta = o.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td style="border-radius:12px;background:${BRAND}">
         <a href="${o.cta.url}" style="display:inline-block;padding:13px 26px;font:600 15px/1 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#fff;text-decoration:none">${esc(o.cta.label)}</a>
       </td></tr></table>`
    : "";
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0f1016;padding:24px 12px">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.35)">
    <tr><td style="background:#14151b;padding:22px 28px;text-align:center">
      <div style="font:800 26px/1 -apple-system,Segoe UI,Roboto,Arial,sans-serif;letter-spacing:-.5px;color:#fff">i<span style="color:${BRAND}">Club</span></div>
      <div style="margin-top:5px;font:600 10px/1 Arial,sans-serif;letter-spacing:.32em;text-transform:uppercase;color:#8a8f9c">Namioty i eventy</div>
    </td></tr>
    <tr><td style="height:4px;background:${BRAND}"></td></tr>
    <tr><td style="padding:30px 28px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${INK}">
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:${INK}">${esc(o.heading)}</h1>
      ${o.intro ? `<p style="margin:0 0 12px;font-size:14.5px;line-height:1.6;color:#33353d">${esc(o.intro)}</p>` : ""}
      ${o.bodyHtml ?? ""}
      ${cta}
    </td></tr>
    <tr><td style="padding:18px 28px;background:#f6f6f8;border-top:1px solid #ececef;font:400 12px/1.6 Arial,sans-serif;color:#8a8f9c;text-align:center">
      ${o.footerNote ? `<div style="margin-bottom:6px;color:#6b6f7a">${esc(o.footerNote)}</div>` : ""}
      iClub · odpalamy@iclubevents.pl · <a href="https://iclubevents.pl" style="color:${BRAND};text-decoration:none">iclubevents.pl</a>
    </td></tr>
  </table>
  <div style="max-width:560px;margin-top:14px;font:400 11px/1.5 Arial,sans-serif;color:#5a5e6b;text-align:center">Wiadomość wysłana automatycznie przez system iClub. Jeśli trafiła do Ciebie omyłkowo — zignoruj ją.</div>
</td></tr></table>
</body></html>`;
}
