"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import type { Icon } from "@phosphor-icons/react";
import { LightningIcon, MagnifyingGlassIcon, PlusIcon, SidebarSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useNewTicket } from "@/components/tickets/new-ticket-dialog";
import { VIEW_META } from "@/components/tickets/ticket-views-config";
import { ticketViewHref } from "@/hooks/use-ticket-query";
import { useViewCounts } from "@/hooks/use-tickets";
import type { TicketView } from "@/lib/schemas/ticket";
import { groupHeading, itemClass, SearchResults } from "./global-search";
import { useShell } from "./shell-context";

const GO_TO: TicketView[] = ["mine", "unassigned", "team", "sla_at_risk", "overdue", "pending", "all"];

interface Action {
  id: string;
  label: string;
  icon: Icon;
  hint?: string;
  run: () => void;
}

/**
 * Ctrl/⌘ K palette (also opened from the sidebar's Quick actions card):
 * run an action, jump to a queue, or search tickets and customers.
 */
export function QuickActions() {
  const router = useRouter();
  const { paletteOpen: open, setPaletteOpen: setOpen, toggleCollapsed } = useShell();
  const { openNewTicket } = useNewTicket();
  const { data: counts } = useViewCounts();
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const close = () => {
    setOpen(false);
    setQ("");
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };

  const actions: Action[] = [
    {
      id: "new",
      label: "New ticket",
      icon: PlusIcon,
      run: () => {
        close();
        openNewTicket();
      },
    },
    {
      id: "sidebar",
      label: "Toggle sidebar",
      icon: SidebarSimpleIcon,
      run: () => {
        close();
        toggleCollapsed();
      },
    },
  ];
  const views: Action[] = GO_TO.map((v) => ({
    id: v,
    label: VIEW_META[v].label,
    icon: VIEW_META[v].icon,
    hint: counts ? String(counts[v]) : undefined,
    run: () => go(ticketViewHref(v)),
  }));
  const term = q.trim().toLowerCase();
  const match = (a: Action) => !term || a.label.toLowerCase().includes(term);

  const group = (heading: string, items: Action[]) =>
    items.some(match) && (
      <Command.Group heading={heading} className={groupHeading}>
        {items.filter(match).map((a) => (
          <Command.Item key={a.id} value={`${heading}-${a.id}`} onSelect={a.run} className={itemClass}>
            <a.icon size={16} aria-hidden className="shrink-0 text-ink-muted" />
            <span className="flex-1 truncate text-body text-ink">{a.label}</span>
            {a.hint && <span className="text-caption text-ink-muted">{a.hint}</span>}
          </Command.Item>
        ))}
      </Command.Group>
    );

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent showCloseButton={false} className="top-[12vh] max-h-[76dvh] translate-y-0 gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Quick actions</DialogTitle>
        <DialogDescription className="sr-only">Run an action, jump to a queue, or search tickets and customers.</DialogDescription>
        <Command shouldFilter={false} loop>
          <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
            <LightningIcon size={18} weight="fill" aria-hidden className="text-desk" />
            <Command.Input
              autoFocus
              value={q}
              onValueChange={setQ}
              placeholder="Search or run an action…"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-muted focus:outline-none"
            />
            <kbd className="rounded border border-line px-1.5 font-sans text-[11px] text-ink-muted">Esc</kbd>
          </div>
          <Command.List className="max-h-[60dvh] overflow-y-auto p-1.5">
            {group("Actions", actions)}
            {group("Go to", views)}
            {term.length >= 2 ? (
              <SearchResults q={q} onPick={go} />
            ) : (
              <p className="flex items-center gap-2 px-2.5 py-3 text-caption text-ink-muted">
                <MagnifyingGlassIcon size={14} aria-hidden /> Type 2+ characters to search tickets and customers
              </p>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
