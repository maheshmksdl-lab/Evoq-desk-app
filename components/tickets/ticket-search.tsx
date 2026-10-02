"use client";

import { useEffect, useState } from "react";
import { SearchBox } from "@/components/shared/desk-ui";
import { cn } from "@/lib/utils";

/** Debounced list search. Keeps in step with the URL when it changes elsewhere (e.g. header search). */
export function TicketSearch({ value, onChange, className }: { value: string; onChange: (q: string) => void; className?: string }) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  // URL changed from outside this box — adopt it unless the agent is typing.
  if (value !== prevValue) {
    setPrevValue(value);
    if (!focused) setText(value);
  }

  useEffect(() => {
    if (text.trim() === value) return;
    const id = setTimeout(() => onChange(text.trim()), 250);
    return () => clearTimeout(id);
  }, [text, value, onChange]);

  return (
    <SearchBox
      value={text}
      onChange={setText}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && text) {
          e.stopPropagation();
          setText("");
          onChange("");
        }
      }}
      placeholder="Search tickets, customers, emails…"
      aria-label="Search tickets by ID, subject, customer, contact, email or assignee"
      className={cn("w-full sm:w-[248px]", className)}
    />
  );
}
