"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { TimeLabel } from "@/components/shared/time-label";
import { focusClock } from "@/lib/sla";
import { ACTIVE_STATUSES, CATEGORY_LABEL, SOURCE_LABEL } from "@/lib/ticket-meta";
import type { TicketSummary } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { TicketRowActions } from "./ticket-actions";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import { TicketSlaIndicator } from "./ticket-sla-indicator";
import { TicketStatusBadge } from "./ticket-status-badge";

const bodyCell = "px-3 py-3 border-b border-line-soft align-middle";

const needsReply = (t: TicketSummary) => t.awaiting === "agent" && ACTIVE_STATUSES.includes(t.status);

/** Teal record link (ticket #) — the ServiceOps IdLink in Desk colours. */
export function TicketIdLink({ ticket, className }: { ticket: Pick<TicketSummary, "id" | "ticketNumber">; className?: string }) {
  return (
    <Link
      href={`/tickets/${ticket.id}`}
      onClick={(e) => e.stopPropagation()}
      className={cn("text-table-cell font-semibold whitespace-nowrap text-desk hover:underline focus-visible:outline-2 focus-visible:outline-desk-action", className)}
    >
      #{ticket.ticketNumber}
    </Link>
  );
}

/** Desktop / tablet row. The ticket # is a real link; the rest of the row is a mouse convenience. */
export function TicketRow({ ticket }: { ticket: TicketSummary }) {
  const router = useRouter();
  const href = `/tickets/${ticket.id}`;

  return (
    <tr
      onClick={(e) => {
        // Ignore clicks from controls in the row and from portaled menus (React bubbles those here too).
        if (!e.currentTarget.contains(e.target as Node)) return;
        if ((e.target as HTMLElement).closest("a, button")) return;
        if (window.getSelection()?.toString()) return;
        router.push(href);
      }}
      className="cursor-pointer transition-colors hover:bg-desk-tint"
    >
      <td className={cn(bodyCell, "pl-4")}>
        <TicketIdLink ticket={ticket} />
      </td>
      <td className={cn(bodyCell, "max-w-[280px] 2xl:max-w-[340px]")}>
        <p className="flex min-w-0 items-center gap-1.5 text-table-cell text-ink">
          {needsReply(ticket) && (
            <span className="size-1.5 shrink-0 rounded-full bg-desk" title="Customer is waiting for a reply">
              <span className="sr-only">Customer is waiting for a reply. </span>
            </span>
          )}
          <span className="truncate">{ticket.subject}</span>
        </p>
        <p className="truncate text-table-cell-secondary text-ink-muted">
          <span className="2xl:hidden">{ticket.customer.name} · </span>
          {CATEGORY_LABEL[ticket.category]} · via {SOURCE_LABEL[ticket.source]}
        </p>
      </td>
      <td className={cn(bodyCell, "hidden 2xl:table-cell")}>
        <p className="text-table-cell whitespace-nowrap text-ink">{ticket.customer.name}</p>
        <p className="text-table-cell-secondary whitespace-nowrap text-ink-muted">{ticket.contact.name}</p>
      </td>
      <td className={bodyCell}>
        <TicketPriorityBadge priority={ticket.priority} />
      </td>
      <td className={bodyCell}>
        <TicketStatusBadge status={ticket.status} />
      </td>
      <td className={bodyCell}>
        <TicketSlaIndicator sla={ticket.sla} />
      </td>
      <td className={bodyCell}>
        <div className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={ticket.assignee?.name ?? null} src={ticket.assignee?.avatar} />
          <p className={cn("text-table-cell whitespace-nowrap", ticket.assignee ? "text-ink" : "text-ink-muted")}>{ticket.assignee?.name ?? "Unassigned"}</p>
        </div>
      </td>
      <td className={cn(bodyCell, "hidden 2xl:table-cell")}>
        <p className="text-table-cell whitespace-nowrap text-ink">
          <TimeLabel iso={ticket.updatedAt} />
        </p>
        <p className="text-table-cell-secondary whitespace-nowrap text-ink-muted">{ticket.team.name}</p>
      </td>
      <td className={cn(bodyCell, "w-12 pr-2 text-right")}>
        <TicketRowActions ticket={ticket} />
      </td>
    </tr>
  );
}

/** Phone layout: one tappable card per ticket (ServiceOps mobile list card). */
export function TicketCard({ ticket }: { ticket: TicketSummary }) {
  const router = useRouter();
  const sla = focusClock(ticket.sla);
  const urgentSla = sla.state === "at_risk" || sla.state === "breached";
  const open = () => router.push(`/tickets/${ticket.id}`);
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter") open();
      }}
      aria-label={`Ticket #${ticket.ticketNumber}: ${ticket.subject}`}
      className="rounded-xl border border-line-soft bg-card p-3.5 transition-colors focus-visible:outline-2 focus-visible:outline-desk-action active:bg-desk-tint"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-desk">#{ticket.ticketNumber}</p>
          <p className="mt-0.5 line-clamp-2 text-table-cell font-medium text-ink">{ticket.subject}</p>
          <p className="truncate text-table-cell-secondary text-ink-muted">
            {ticket.customer.name} · {ticket.contact.name}
          </p>
        </div>
        <TicketStatusBadge status={ticket.status} className="shrink-0" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <TicketPriorityBadge priority={ticket.priority} />
        <span className="inline-flex min-w-0 items-center gap-1.5 text-caption text-ink-body">
          <UserCircleIcon size={14} aria-hidden className="shrink-0" />
          <span className="truncate">{ticket.assignee?.name ?? "Unassigned"}</span>
          <span aria-hidden>·</span>
          <TimeLabel iso={ticket.updatedAt} className="whitespace-nowrap" />
        </span>
      </div>
      {urgentSla && (
        <div className="mt-2 border-t border-line-soft pt-2">
          <TicketSlaIndicator sla={ticket.sla} className="flex-row items-center gap-1.5 [&>span:last-child]:before:content-['·_']" />
        </div>
      )}
    </div>
  );
}
