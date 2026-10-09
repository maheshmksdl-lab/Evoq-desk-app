import type { RelatedTicketSummary } from "@/lib/types/ticket";
import { TicketLink } from "./ticket-link";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import { TicketStatusBadge } from "./ticket-status-badge";

/** Linked ticket list — teal ticket # + status pill, subject, priority (ServiceOps "Field job" card rows). */
export function RelatedTickets({ tickets, empty }: { tickets: RelatedTicketSummary[]; empty: string }) {
  if (!tickets.length) return <p className="text-body text-ink-muted">{empty}</p>;
  return (
    <ul className="-mx-2 flex flex-col gap-1">
      {tickets.map((t) => (
        <li key={t.id}>
          <TicketLink
            ticketId={t.id}
            className="block rounded-lg px-2 py-2 transition-colors hover:bg-desk-tint focus-visible:outline-2 focus-visible:outline-desk-action"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-table-cell font-semibold text-desk">#{t.ticketNumber}</span>
              <TicketStatusBadge status={t.status} />
            </span>
            <span className="mt-0.5 block truncate text-body text-ink">{t.subject}</span>
            <TicketPriorityBadge priority={t.priority} className="mt-1 text-caption" />
          </TicketLink>
        </li>
      ))}
    </ul>
  );
}
