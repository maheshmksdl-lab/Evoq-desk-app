import { Pill } from "@/components/shared/desk-ui";
import { STATUS_META } from "@/lib/ticket-meta";
import type { TicketStatus } from "@/lib/types/ticket";

/** Ticket status pill — dot + label, so it never relies on colour alone. */
export function TicketStatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <Pill tone={meta.tone} className={className}>
      {meta.label}
    </Pill>
  );
}
