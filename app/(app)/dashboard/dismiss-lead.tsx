"use client";
// ✕ na kaflu leada z konfiguratora — schowaj z pulpitu (ustawia LOST, odwracalne „Odgrzej").
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissInquiryAction } from "../inquiries/actions";

export function DismissLeadX({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      title="Schowaj z pulpitu"
      disabled={pending}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); start(async () => { await dismissInquiryAction(id); router.refresh(); }); }}
      className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#2a3550] bg-[#0f1a2b] text-[13px] font-bold text-ink-2 hover:border-[#f58585] hover:text-bad disabled:opacity-40"
    >
      ✕
    </button>
  );
}
