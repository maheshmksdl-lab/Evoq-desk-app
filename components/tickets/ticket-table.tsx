"use client";

import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react/dist/ssr";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { TicketSort } from "@/lib/schemas/ticket";
import type { TicketSummary } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { usePresenceIndex } from "@/hooks/use-presence";
import { useLookups } from "@/hooks/use-tickets";
import { resolvePresence, typingText } from "./ticket-presence";
import { LIST_COLS, TicketCard, TicketRow, type ListDensity } from "./ticket-row";

const headCell = "px-3 py-2.5 text-left text-[12px] leading-4 font-medium text-ink-muted whitespace-nowrap border-b border-line bg-card";

type SortSpec = { desc: TicketSort; asc?: TicketSort };

function SortHeader({ label, spec, sort, onSort, className, colSpan }: { label: string; spec: SortSpec; sort: TicketSort; onSort: (s: TicketSort) => void; className?: string; colSpan?: number }) {
  const active = sort === spec.desc || sort === spec.asc;
  const asc = sort === spec.asc;
  const next = active && !asc && spec.asc ? spec.asc : spec.desc;
  const SortIcon = asc ? ArrowUpIcon : ArrowDownIcon;
  return (
    <th scope="col" colSpan={colSpan} aria-sort={active ? (asc ? "ascending" : "descending") : undefined} className={cn(headCell, className)}>
      <button type="button" onClick={() => onSort(next)} className={cn("inline-flex items-center gap-1 transition-colors hover:text-desk", active && "text-ink")}>
        {label}
        <SortIcon size={12} weight="bold" aria-hidden className={active ? "" : "opacity-30"} />
      </button>
    </th>
  );
}

/** Dense ticket table — select, dot + number, subject with preview, customer, channel, SLA, updated, assignee. Card list below md. */
export function TicketTable({
  tickets,
  sort,
  onSort,
  dimmed,
  selected,
  onSelectionChange,
  openId,
  onOpen,
  onIntent,
  density = "comfortable",
}: {
  tickets: TicketSummary[];
  sort: TicketSort;
  onSort: (s: TicketSort) => void;
  dimmed?: boolean;
  selected: ReadonlySet<string>;
  onSelectionChange: (ids: Set<string>) => void;
  /** The ticket open in the workspace beside the list. */
  openId?: string;
  /** Opens a ticket in the Inbox workspace. */
  onOpen: (id: string) => void;
  onIntent?: (id: string) => void;
  density?: ListDensity;
}) {
  // One subscription for the whole table: "Alex is replying…" hints per row.
  const presence = usePresenceIndex();
  const { data: lookups } = useLookups();
  const typingOn = (id: string) => typingText(resolvePresence(presence[id] ?? [], lookups?.agents));
  const picked = tickets.filter((t) => selected.has(t.id)).length;
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (!next.delete(id)) next.add(id);
    onSelectionChange(next);
  };

  return (
    // Sized by its own width, not the viewport: cards when narrow (phones, or a tablet beside an open ticket), a table otherwise.
    <div className={cn("@container border-t border-line transition-opacity", dimmed && "opacity-60")} aria-busy={dimmed}>
      <div className="@xl:hidden" role="list" aria-label="Tickets">
        {tickets.map((t) => (
          <div role="listitem" key={t.id}>
            <TicketCard ticket={t} typing={typingOn(t.id)} active={t.id === openId} onOpen={onOpen} onIntent={onIntent} />
          </div>
        ))}
      </div>
      <div className="relative hidden overflow-x-auto px-1 @xl:block">
        <table className="w-full border-separate border-spacing-0">
          <caption className="sr-only">Tickets</caption>
          <thead>
            <tr>
              <th scope="col" className={cn(headCell, "w-10 pr-0 pl-5")}>
                <Checkbox
                  checked={picked === 0 ? false : picked === tickets.length ? true : "indeterminate"}
                  onCheckedChange={() => onSelectionChange(picked === tickets.length ? new Set() : new Set(tickets.map((t) => t.id)))}
                  aria-label={picked === tickets.length ? "Deselect all tickets on this page" : "Select all tickets on this page"}
                  className="border-ink-faint bg-card"
                />
              </th>
              {/* Wide list: "Ticket" heads the # column. Narrow list: the # moves into the subject cell, so it heads that. */}
              <SortHeader label="Ticket" spec={{ desc: "created_desc", asc: "created_asc" }} sort={sort} onSort={onSort} className={LIST_COLS.number} />
              <SortHeader label="Ticket" spec={{ desc: "created_desc", asc: "created_asc" }} sort={sort} onSort={onSort} className="@4xl:[&>button]:invisible" />
              <th scope="col" className={cn(headCell, LIST_COLS.customer)}>
                Customer
              </th>
              <th scope="col" className={cn(headCell, "text-center")}>
                Channel
              </th>
              <SortHeader label="SLA" spec={{ desc: "sla_asc" }} sort={sort} onSort={onSort} />
              <SortHeader label="Updated" spec={{ desc: "updated_desc", asc: "updated_asc" }} sort={sort} onSort={onSort} className={LIST_COLS.updated} />
              <th scope="col" className={headCell}>
                Assignee
              </th>
              <th scope="col" className={headCell}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <TicketRow
                key={t.id}
                ticket={t}
                selected={selected.has(t.id)}
                onToggleSelect={() => toggle(t.id)}
                active={t.id === openId}
                onOpen={onOpen}
                onIntent={onIntent}
                typing={typingOn(t.id)}
                density={density}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TicketTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-hidden className="border-t border-line">
      <div className="hidden h-9 border-b border-line md:block" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line-soft px-5 py-3.5">
          <Skeleton className="size-2 rounded-full" />
          <Skeleton className="h-3.5 w-12" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-[min(300px,80%)]" />
            <Skeleton className="h-3 w-[min(220px,60%)]" />
          </div>
          <Skeleton className="hidden size-8 rounded-full md:block" />
          <Skeleton className="hidden h-3.5 w-24 md:block" />
          <Skeleton className="hidden size-7 rounded-md md:block" />
          <Skeleton className="hidden h-3.5 w-16 md:block" />
          <Skeleton className="hidden size-6 rounded-full md:block" />
        </div>
      ))}
    </div>
  );
}
