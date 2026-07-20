"use client";
// Pull-to-refresh (mobile): przeciągnięcie w dół przy górze strony pokazuje
// kółeczko i odświeża dane bieżącego widoku (router.refresh — force-dynamic RSC).
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";

const THRESHOLD = 70; // px przeciągnięcia do wyzwolenia
const MAX_PULL = 120; // maksymalne wychylenie kółka
const RESISTANCE = 0.5; // opór (kółko idzie wolniej niż palec)

export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [pending, startTransition] = useTransition();
  const s = useRef({ startY: 0, active: false, pull: 0 });

  useEffect(() => {
    const set = (v: number) => {
      s.current.pull = v;
      setPull(v);
    };
    const onStart = (e: TouchEvent) => {
      // Aktywuj tylko przy samej górze i jednym palcu.
      if (window.scrollY > 0 || e.touches.length !== 1) {
        s.current.active = false;
        return;
      }
      s.current.startY = e.touches[0].clientY;
      s.current.active = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!s.current.active) return;
      if (window.scrollY > 0) {
        s.current.active = false;
        set(0);
        return;
      }
      const dy = e.touches[0].clientY - s.current.startY;
      if (dy <= 0) {
        if (s.current.pull) set(0);
        return;
      }
      e.preventDefault(); // wyłącz natywny bounce/overscroll podczas ciągnięcia
      set(Math.min(MAX_PULL, dy * RESISTANCE));
    };
    const onEnd = () => {
      if (!s.current.active) return;
      s.current.active = false;
      const p = s.current.pull;
      set(0);
      if (p >= THRESHOLD) startTransition(() => router.refresh());
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  const dragging = s.current.active;
  const visible = pull > 0 || pending;
  const progress = Math.min(1, pull / THRESHOLD);
  const ready = progress >= 1;
  const offset = pending ? 56 : pull;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center md:hidden"
      style={{
        transform: `translateY(${offset - 48}px)`,
        opacity: visible ? 1 : 0,
        transition: dragging ? "none" : "transform .25s ease, opacity .2s ease",
      }}
    >
      <span className="mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-panel shadow-lg">
        <Icon
          name="refresh"
          className={`h-5 w-5 ${pending || ready ? "text-ok" : "text-ink"} ${pending ? "animate-spin" : ""}`}
          style={pending ? undefined : { transform: `rotate(${progress * 270}deg)`, opacity: 0.35 + 0.65 * progress }}
        />
      </span>
    </div>
  );
}
