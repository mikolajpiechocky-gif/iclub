// app/page.tsx — wejście: przekierowanie do pulpitu właściciela.
// INTEGRACJA: nadpisuje istniejący app/page.tsx z szablonu Next.js.
// TODO(backend): tutaj docelowo logika logowania / wyboru roli.
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
