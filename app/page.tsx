// app/page.tsx — wejście: przekierowanie wg roli (właściciel → pulpit, pracownik → jego Start).
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data/profiles";

export default async function RootPage() {
  const profile = await getCurrentProfile();
  redirect(profile && profile.role !== "OWNER" ? "/me" : "/dashboard");
}
