"use client";

import { ProhibitIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { NextStep, StripButton } from "@/components/shared/desk-ui";
import { useUpdateTicket } from "@/hooks/use-ticket";
import type { Ticket } from "@/lib/types/ticket";

/** Shown on a spam ticket opened by link or from the spam filter — it's hidden from every view. */
export function TicketSpamNotice({ ticket }: { ticket: Pick<Ticket, "id" | "ticketNumber" | "spam"> }) {
  const update = useUpdateTicket();
  if (!ticket.spam) return null;
  return (
    <NextStep
      tone="red"
      label={
        <span className="inline-flex items-center gap-1.5">
          <ProhibitIcon size={15} aria-hidden className="shrink-0" />
          Marked as spam — hidden from every view and queue.
        </span>
      }
      action={
        <StripButton
          disabled={update.isPending}
          onClick={() => update.mutate({ id: ticket.id, patch: { spam: false } }, { onSuccess: () => toast.success(`#${ticket.ticketNumber} moved out of spam`) })}
        >
          Not spam
        </StripButton>
      }
    />
  );
}
