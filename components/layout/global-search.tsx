"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { BuildingsIcon, MagnifyingGlassIcon, TicketIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useDeskSearch } from "@/hooks/use-tickets";
import { pluralize } from "@/lib/format";
import { STATUS_META } from "@/lib/ticket-meta";

export const groupHeading =
  "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-nav-group-label [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-ink-muted";
export const itemClass =
  "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors data-[selected=true]:bg-desk-tint";

/** Grouped results for tickets (ID, subject, email) and customers. */
export function SearchResults({ q, onPick }: { q: string; onPick: (href: string) => void }) {
  const term = useDeferredValue(q).trim();
  const { data, isFetching } = useDeskSearch(term.length >= 2 ? term : "");

  if (term.length < 2) {
    return <p className="px-4 py-6 text-center text-caption text-ink-muted">Type a ticket ID, subject, customer, contact or email address</p>;
  }
  if (!data && isFetching) return <p className="px-4 py-6 text-center text-body text-ink-muted">Searching…</p>;
  if (data && !data.tickets.length && !data.customers.length) {
    return <p className="px-4 py-6 text-center text-body text-ink-muted">No matches for “{term}”</p>;
  }
  return (
    <div className="p-1.5">
      {!!data?.tickets.length && (
        <Command.Group heading="Tickets" className={groupHeading}>
          {data.tickets.map((t) => (
            <Command.Item key={t.id} value={`t-${t.id}`} onSelect={() => onPick(`/tickets/${t.id}`)} className={itemClass}>
              <TicketIcon size={16} weight="duotone" aria-hidden className="shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-ink">{t.subject}</span>
                <span className="block truncate text-caption text-ink-muted">
                  #{t.ticketNumber} · {t.customer.name} · {STATUS_META[t.status].label}
                </span>
              </span>
            </Command.Item>
          ))}
        </Command.Group>
      )}
      {!!data?.customers.length && (
        <Command.Group heading="Customers" className={groupHeading}>
          {data.customers.map(({ customer, contacts, openTickets }) => (
            <Command.Item key={customer.id} value={`c-${customer.id}`} onSelect={() => onPick(`/tickets?customer=${customer.id}`)} className={itemClass}>
              <BuildingsIcon size={16} weight="duotone" aria-hidden className="shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-ink">{customer.name}</span>
                <span className="block truncate text-caption text-ink-muted">
                  {pluralize(openTickets, "open ticket")} · {contacts.map((c) => c.email).join(", ")}
                </span>
              </span>
            </Command.Item>
          ))}
        </Command.Group>
      )}
      <Command.Item value={`all-${term}`} onSelect={() => onPick(`/tickets?q=${encodeURIComponent(term)}`)} className={`${itemClass} mt-1`}>
        <MagnifyingGlassIcon size={16} aria-hidden className="shrink-0 text-ink-muted" />
        <span className="text-body text-ink">Show all tickets matching “{term}”</span>
      </Command.Item>
    </div>
  );
}

/** Header search (desktop) — inline field with a results dropdown. "/" focuses it (Ctrl/⌘ K opens Quick actions). */
export function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable=true]");
      if (e.key === "/" && !typing) {
        if (!inputRef.current?.offsetParent) return; // hidden on small screens — MobileSearch handles it
        e.preventDefault();
        inputRef.current.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (href: string) => {
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
    router.push(href);
  };

  return (
    <Command shouldFilter={false} loop label="Search Desk" className="relative">
      <div className="flex w-72 items-center gap-2 rounded-xl border border-line bg-desk-tint px-3 py-1.5 transition-all focus-within:border-desk focus-within:bg-white">
        <MagnifyingGlassIcon size={15} aria-hidden className="shrink-0 text-ink-muted" />
        <Command.Input
          ref={inputRef}
          value={q}
          onValueChange={(v) => {
            setQ(v);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQ("");
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Search tickets, customers, emails"
          className="h-6 min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-muted focus:outline-none"
        />
        <kbd className="rounded border border-line px-1 font-sans text-[10px] leading-4 text-ink-faint" aria-hidden>
          /
        </kbd>
      </div>
      {open && (
        <Command.List className="absolute top-full right-0 z-50 mt-1.5 max-h-[420px] w-[380px] overflow-y-auto rounded-xl border border-line bg-card shadow-pop">
          <SearchResults q={q} onPick={pick} />
        </Command.List>
      )}
    </Command>
  );
}

/** Phones / tablets: icon button opening a search dialog. */
export function MobileSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="flex size-9 items-center justify-center rounded-[10px] text-ink transition-colors hover:bg-desk-tint lg:hidden"
      >
        <MagnifyingGlassIcon size={20} aria-hidden />
      </button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQ("");
        }}
      >
        <DialogContent showCloseButton={false} className="top-4 max-h-[85dvh] translate-y-0 gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Search Desk</DialogTitle>
          <DialogDescription className="sr-only">Search tickets by ID, subject, customer, contact or email.</DialogDescription>
          <Command shouldFilter={false} loop>
            <div className="flex h-16 items-center gap-2 border-b border-line px-3">
              <MagnifyingGlassIcon size={18} aria-hidden className="text-ink-muted" />
              <Command.Input
                autoFocus
                value={q}
                onValueChange={setQ}
                placeholder="Search tickets, customers, emails"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
              />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close search" className="flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-desk-tint">
                <XIcon size={18} aria-hidden />
              </button>
            </div>
            <Command.List className="max-h-[65dvh] overflow-y-auto">
              <SearchResults
                q={q}
                onPick={(href) => {
                  setOpen(false);
                  setQ("");
                  router.push(href);
                }}
              />
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
