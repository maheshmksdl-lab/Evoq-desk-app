"use client";

import type { ReactNode } from "react";
import { CaretDownIcon, CheckCircleIcon, FlagIcon, ProhibitIcon, TagIcon, TagSimpleIcon, UserCircleIcon, XCircleIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { useBulkUpdateTickets } from "@/hooks/use-ticket";
import { useLookups } from "@/hooks/use-tickets";
import type { TicketPatch } from "@/lib/api/tickets";
import { pluralize } from "@/lib/format";
import { PRIORITY_META, STATUS_META } from "@/lib/ticket-meta";
import { TICKET_PRIORITIES, TICKET_STATUSES, type TicketSummary } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

const barButton =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 text-[13px] font-medium text-ink-body transition-colors hover:border-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action disabled:opacity-50 data-[state=open]:border-desk";

function BarMenu({ icon, label, disabled, children }: { icon: ReactNode; label: string; disabled: boolean; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={barButton} disabled={disabled}>
        {icon}
        {label}
        <CaretDownIcon size={12} aria-hidden className="text-ink-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[60vh] w-56 overflow-y-auto rounded-xl">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Replaces the filter pills while rows are selected: assign, status, priority,
 * tags, close or spam in one go.
 */
export function TicketBulkBar({ tickets, onClear }: { tickets: TicketSummary[]; onClear: () => void }) {
  const bulk = useBulkUpdateTickets();
  const { data: lookups } = useLookups();
  const ids = tickets.map((t) => t.id);
  const count = ids.length;
  const tagsInSelection = [...new Set(tickets.flatMap((t) => t.tags))].sort();
  const allSpam = tickets.every((t) => t.spam);
  const run = (patch: TicketPatch, message: string, undo?: TicketPatch) =>
    bulk.mutate(
      { ids, patch },
      {
        onSuccess: () => {
          toast.success(`${pluralize(count, "ticket")} ${message}`, {
            action: undo ? { label: "Undo", onClick: () => bulk.mutate({ ids, patch: undo }) } : undefined,
          });
          onClear();
        },
      },
    );
  const me = lookups?.agents.find((a) => a.id === lookups.currentAgentId);

  return (
    <div role="toolbar" aria-label={`Bulk actions for ${pluralize(count, "selected ticket")}`} className="scrollbar-none flex items-center gap-2 overflow-x-auto px-4 pb-3 sm:flex-wrap sm:px-5">
      <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-desk-10 pr-1 pl-2.5 text-[13px] font-semibold text-desk" aria-live="polite">
        {count} selected
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="inline-flex size-6 items-center justify-center rounded-md hover:bg-white focus-visible:outline-2 focus-visible:outline-desk-action"
        >
          <XIcon size={12} weight="bold" aria-hidden />
        </button>
      </span>

      <BarMenu icon={<UserCircleIcon size={15} aria-hidden />} label="Assign" disabled={bulk.isPending}>
        {me && (
          <>
            <DropdownMenuItem onSelect={() => run({ assigneeId: me.id }, "assigned to you")}>
              <PersonAvatar name={me.name} src={me.avatar} size="xs" /> Assign to me
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {lookups?.agents
          .filter((a) => a.id !== me?.id)
          .map((a) => (
            <DropdownMenuItem key={a.id} onSelect={() => run({ assigneeId: a.id }, `assigned to ${a.name}`)}>
              <PersonAvatar name={a.name} src={a.avatar} size="xs" status={a.status} /> {a.name}
            </DropdownMenuItem>
          ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => run({ assigneeId: null }, "unassigned")}>
          <PersonAvatar name={null} size="xs" /> Unassign
        </DropdownMenuItem>
      </BarMenu>

      <BarMenu icon={<CheckCircleIcon size={15} aria-hidden />} label="Status" disabled={bulk.isPending}>
        {TICKET_STATUSES.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => run({ status: s }, `marked ${STATUS_META[s].label}`)}>
            <span className={cn("size-2 rounded-full", STATUS_META[s].dot)} aria-hidden />
            {STATUS_META[s].label}
          </DropdownMenuItem>
        ))}
      </BarMenu>

      <BarMenu icon={<FlagIcon size={15} aria-hidden />} label="Priority" disabled={bulk.isPending}>
        {[...TICKET_PRIORITIES].reverse().map((p) => (
          <DropdownMenuItem key={p} onSelect={() => run({ priority: p }, `set to ${PRIORITY_META[p].label} priority`)} className={PRIORITY_META[p].text}>
            <FlagIcon size={14} weight="fill" aria-hidden />
            {PRIORITY_META[p].label}
          </DropdownMenuItem>
        ))}
      </BarMenu>

      <BarMenu icon={<TagIcon size={15} aria-hidden />} label="Add tag" disabled={bulk.isPending}>
        <DropdownMenuLabel className="text-xs text-muted-foreground">Add to every selected ticket</DropdownMenuLabel>
        {lookups?.tags.map((tag) => (
          <DropdownMenuItem key={tag} onSelect={() => run({ addTag: tag }, `tagged "${tag}"`)}>
            {tag}
          </DropdownMenuItem>
        ))}
      </BarMenu>

      <BarMenu icon={<TagSimpleIcon size={15} aria-hidden />} label="Remove tag" disabled={bulk.isPending || !tagsInSelection.length}>
        <DropdownMenuLabel className="text-xs text-muted-foreground">Remove from every selected ticket</DropdownMenuLabel>
        {tagsInSelection.map((tag) => (
          <DropdownMenuItem key={tag} onSelect={() => run({ removeTag: tag }, `untagged "${tag}"`)}>
            {tag}
          </DropdownMenuItem>
        ))}
      </BarMenu>

      <button type="button" disabled={bulk.isPending} onClick={() => run({ status: "closed" }, "closed")} className={cn(barButton, "hover:border-destructive hover:text-destructive")}>
        <XCircleIcon size={15} aria-hidden />
        Close
      </button>

      {allSpam ? (
        <button type="button" disabled={bulk.isPending} onClick={() => run({ spam: false }, "moved out of spam", { spam: true })} className={barButton}>
          <ProhibitIcon size={15} aria-hidden />
          Not spam
        </button>
      ) : (
        <button
          type="button"
          disabled={bulk.isPending}
          onClick={() => run({ spam: true }, "marked as spam", { spam: false })}
          className={cn(barButton, "hover:border-destructive hover:text-destructive")}
        >
          <ProhibitIcon size={15} aria-hidden />
          Mark as spam
        </button>
      )}
    </div>
  );
}
