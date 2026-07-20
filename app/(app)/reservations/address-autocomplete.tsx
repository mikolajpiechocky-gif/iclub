"use client";
// Pole adresu z podpowiedziami (Places Autocomplete, §37). Wolne wpisywanie
// nadal działa — podpowiedzi to tylko ułatwienie. Debounce 350 ms.
import { useEffect, useRef, useState } from "react";
import { TextField } from "@/components/ui";
import { suggestAddressesAction } from "./address-actions";
import type { AddressSuggestion } from "@/lib/integrations/google-maps";

export function AddressAutocomplete({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const skipNext = useRef(false); // po wyborze podpowiedzi nie odpytuj ponownie
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = value.trim();
    // Cała aktualizacja stanu w callbacku timera (asynchronicznie) — bez
    // synchronicznego setState w ciele efektu.
    const t = setTimeout(async () => {
      if (q.length < 3) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      const res = await suggestAddressesAction(q);
      setSuggestions(res);
      setOpen(res.length > 0);
    }, q.length < 3 ? 0 : 350);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (desc: string) => {
    skipNext.current = true;
    onChange(desc);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <TextField
        label={label}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-[12px] border border-border bg-panel shadow-lg">
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={`${s.placeId ?? s.description}-${i}`}
              onClick={() => pick(s.description)}
              className="block w-full border-t border-border-soft px-3.5 py-2.5 text-left text-[13px] text-ink first:border-t-0 hover:bg-surface-2"
            >
              {s.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
