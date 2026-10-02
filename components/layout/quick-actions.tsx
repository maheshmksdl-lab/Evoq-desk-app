"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import type { Icon } from "@phosphor-icons/react";
import { LightningIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { VIEW_META } from "@/components/tickets/ticket-views-config";
import { isApplePlatform } from "@/hooks/use-keyboard-shortcuts";
import { ticketViewHref } from "@/lib/ticket-routes";
import { useViewCounts } from "@/hooks/use-tickets";
import { ACTIONS, formatShortcut, type ActionGroup, type ActionId } from "@/lib/actions";
import type { TicketView } from "@/lib/schemas/ticket";
import { useActions, useRegisterAction } from "./actions-context";
import { groupHeading, itemClass, SearchResults } from "./global-search";
import { useShell } from "./shell-context";

const GO_TO: TicketView[] = ["mine", "unassigned", "team", "open", "pending", "sla_at_risk", "recent", "all"];
const GROUP_HEADING: Record<ActionGroup, string> = { Ticket: "This ticket", General: "Actions" };

interface Item {
  id: string;
  label: string;
  icon: Icon;
  keywords?: readonly string[];
  /** Right-aligned hint: a count, or shortcut keys. */
  hint?: string | string[];
  run: () => void;
}

function Hint({ hint }: { hint: Item["hint"] }) {
  if (!hint) return null;
  if (typeof hint === "string") return <span className="text-caption text-ink-muted tabular-nums">{hint}</span>;
  return (
    <span className="flex gap-1" aria-hidden>
      {hint.map((k) => (
        <kbd key={k} className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1 font-sans text-[11px] text-ink-body">
          {k}
        </kbd>
      ))}
    </span>
  );
}

/**
 * Ctrl/⌘ K palette (also opened from the sidebar's Quick actions card).
 * Lists every action available right now from the shared action list — with
 * its shortcut, so agents learn the keys — plus queues and search.
 */
export function QuickActions() {
  const router = useRouter();
  const { paletteOpen: open, setPaletteOpen: setOpen } = useShell();
  const { available, run } = useActions();
  const { data: counts } = useViewCounts();
  const [q, setQ] = useState("");

  useRegisterAction("open-command-menu", () => setOpen(true));

  const close = () => {
    setOpen(false);
    setQ("");
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };
  // Run after the dialog closes, so the action can move focus (e.g. into the composer).
  const runAction = (id: ActionId) => {
    close();
    requestAnimationFrame(() => run(id));
  };

  const apple = open && isApplePlatform();
  const actionItems = (group: ActionGroup): Item[] =>
    available
      .filter((id) => ACTIONS[id].group === group && ACTIONS[id].inMenu)
      .map((id) => {
        const def = ACTIONS[id];
        return {
          id,
          label: def.label,
          icon: def.icon,
          keywords: def.keywords,
          hint: def.shortcut ? formatShortcut(def.shortcut, apple) : undefined,
          run: () => runAction(id),
        };
      });
  const views: Item[] = GO_TO.map((v) => ({
    id: v,
    label: `Go to ${VIEW_META[v].label}`,
    icon: VIEW_META[v].icon,
    hint: counts ? String(counts[v]) : undefined,
    run: () => go(ticketViewHref(v)),
  }));

  const term = q.trim().toLowerCase();
  const match = (a: Item) => !term || [a.label, ...(a.keywords ?? [])].some((w) => w.toLowerCase().includes(term));

  const group = (heading: string, items: Item[]) =>
    items.some(match) && (
      <Command.Group heading={heading} className={groupHeading}>
        {items.filter(match).map((a) => (
          <Command.Item key={a.id} value={`${heading}-${a.id}`} onSelect={a.run} className={itemClass}>
            <a.icon size={16} aria-hidden className="shrink-0 text-ink-muted" />
            <span className="flex-1 truncate text-body text-ink">{a.label}</span>
            <Hint hint={a.hint} />
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
            {group(GROUP_HEADING.Ticket, actionItems("Ticket"))}
            {group(GROUP_HEADING.General, actionItems("General"))}
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
