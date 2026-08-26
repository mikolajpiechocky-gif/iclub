// Stosuje SQL do bazy Supabase projektu iClub przez Management API — bez udziału użytkownika.
// Token i ref czytane z .env.local (SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF); plik jest w .gitignore.
//
// Użycie:
//   node scripts/db-apply.mjs supabase/migrations/00XX_nazwa.sql   # zastosuj plik migracji
//   echo "select 1;" | node scripts/db-apply.mjs                   # zastosuj SQL ze stdin
//
// SQL powinien być idempotentny (create ... if not exists, drop ... if exists), bo bywa uruchamiany
// ponownie. Zwraca kod wyjścia 0 przy sukcesie (HTTP 2xx), 1 przy błędzie.
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* brak .env.local — użyj zmiennych środowiskowych */ }
}

// Ustawiamy process.exitCode i pozwalamy Node zamknąć się naturalnie — process.exit() podczas
// zamykania pętli zdarzeń wywala asercję libuv na Windows (choć samo zapytanie się udaje).
async function main() {
  loadEnvLocal();
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!token || !ref) {
    console.error("Brak SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF (dodaj do .env.local).");
    process.exitCode = 1; return;
  }
  const file = process.argv[2];
  const sql = (file ? readFileSync(file, "utf8") : readFileSync(0, "utf8")).trim();
  if (!sql) { console.error("Pusty SQL."); process.exitCode = 1; return; }

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  console.log("HTTP", res.status);
  console.log(body);
  process.exitCode = res.ok ? 0 : 1;
}

await main();
