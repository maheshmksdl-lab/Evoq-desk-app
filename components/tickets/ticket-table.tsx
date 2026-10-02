"use client";

import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import type { TicketSort } from "@/lib/schemas/ticket";
import type { TicketSummary } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { TicketCard, TicketRow } from "./ticket-row";

const headCell = "px-3 py-3.5 text-left text-table-header text-ink whitespace-nowrap bg-desk-tint";

type SortSpec = { desc: TicketSort; asc?: TicketSort };

function SortHeader({ label, spec, sort, onSort, className }: { label: string; spec: SortSpec; sort: TicketSort; onSort: (s: TicketSort) => void; className?: string }) {
  const active = sort === spec.desc || sort === spec.asc;
  const asc = sort === spec.asc;
  const next = active && !asc && spec.asc ? spec.asc : spec.desc;
  const SortIcon = asc ? ArrowUpIcon : ArrowDownIcon;
  return (
    <th scope="col" aria-sort={active ? (asc ? "ascending" : "descending") : undefined} className={cn(headCell, className)}>
      <button type="button" onClick={() => onSort(next)} className="inline-flex items-center gap-1.5 transition-colors hover:text-desk">
        {label}
        <SortIcon size={13} weight="bold" aria-hidden className={active ? "" : "opacity-30"} />
      </button>
    </th>
  );
}

/** Ticket table (ServiceOps DataTable look) with a card list below md. */
export function TicketTable({
  tickets,
  sort,
  onSort,
  dimmed,
}: {
  tickets: TicketSummary[];
  sort: TicketSort;
  onSort: (s: TicketSort) => void;
  dimmed?: boolean;
}) {
  return (
    <div className={cn("transition-opacity", dimmed && "opacity-60")} aria-busy={dimmed}>
      <div className="mt-3 flex flex-col gap-2 md:hidden" role="list" aria-label="Tickets">
        {tickets.map((t) => (
          <div role="listitem" key={t.id}>
            <TicketCard ticket={t} />
          </div>
        ))}
      </div>
      <div className="relative mt-4 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] border-separate border-spacing-0">
          <caption className="sr-only">Tickets</caption>
          <thead>
            <tr>
              <SortHeader label="Ticket #" spec={{ desc: "created_desc", asc: "created_asc" }} sort={sort} onSort={onSort} className="rounded-l-xl pl-4" />
              <th scope="col" className={headCell}>
                Subject
              </th>
              <th scope="col" className={cn(headCell, "hidden 2xl:table-cell")}>
                Customer
              </th>
              <SortHeader label="Priority" spec={{ desc: "priority_desc" }} sort={sort} onSort={onSort} />
              <th scope="col" className={headCell}>
                Status
              </th>
              <SortHeader label="SLA" spec={{ desc: "sla_asc" }} sort={sort} onSort={onSort} />
              <th scope="col" className={headCell}>
                Assigned to
              </th>
              <SortHeader label="Updated" spec={{ desc: "updated_desc", asc: "updated_asc" }} sort={sort} onSort={onSort} className="hidden 2xl:table-cell" />
              <th scope="col" className={cn(headCell, "rounded-r-xl")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <TicketRow key={t.id} ticket={t} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TicketTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-hidden className="mt-4">
      <div className="hidden h-12 rounded-xl bg-desk-tint md:block" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line-soft px-3 py-4">
          <Skeleton className="h-4 w-28" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-[min(320px,80%)]" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
          <Skeleton className="hidden h-6 w-24 rounded-full md:block" />
          <Skeleton className="hidden size-8 rounded-full md:block" />
        </div>
      ))}
    </div>
  );
}
