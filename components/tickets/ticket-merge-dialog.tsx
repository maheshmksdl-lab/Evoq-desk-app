"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DetailPrimaryButton, SecondaryButton } from "@/components/shared/desk-ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMergeTicket } from "@/hooks/use-ticket";
import { useTickets } from "@/hooks/use-tickets";
import { ticketQuerySchema } from "@/lib/schemas/ticket";
import type { Ticket } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { TicketStatusBadge } from "./ticket-status-badge";

/** Merge another unresolved ticket from the same customer into this one. */
export function TicketMergeDialog({ ticket, open, onOpenChange }: { ticket: Ticket; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const merge = useMergeTicket();
  const { data, isPending } = useTickets(
    ticketQuerySchema.parse({ customer: ticket.customer.id, status: "open,pending,on_hold", size: "50" }),
  );
  const candidates = data?.items.filter((t) => t.id !== ticket.id) ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setSelected(null);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Merge into #{ticket.ticketNumber}</DialogTitle>
          <DialogDescription>
            Choose a duplicate from {ticket.customer.name}. It will be closed and linked here; its conversation stays on the original ticket.
          </DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Ticket to merge" className="max-h-72 space-y-1.5 overflow-y-auto">
          {isPending && <p className="py-6 text-center text-sm text-ink-muted">Loading tickets…</p>}
          {!isPending && !candidates.length && (
            <p className="py-6 text-center text-sm text-ink-muted">{ticket.customer.name} has no other unresolved tickets to merge.</p>
          )}
          {candidates.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected === t.id}
              onClick={() => setSelected(t.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border border-line-soft px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-desk-action",
                selected === t.id ? "border-desk bg-desk-tint" : "hover:bg-desk-tint",
              )}
            >
              <span
                className={cn("mt-1 size-3.5 shrink-0 rounded-full border-2", selected === t.id ? "border-desk bg-desk ring-2 ring-white ring-inset" : "border-input")}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-ink-muted">#{t.ticketNumber} · {t.contact.name}</span>
                <span className="block truncate text-sm font-medium">{t.subject}</span>
              </span>
              <TicketStatusBadge status={t.status} />
            </button>
          ))}
        </div>
        <DialogFooter>
          <SecondaryButton onClick={() => onOpenChange(false)}>Cancel</SecondaryButton>
          <DetailPrimaryButton
            disabled={!selected || merge.isPending}
            onClick={() =>
              merge.mutate(
                { primaryId: ticket.id, secondaryId: selected! },
                {
                  onSuccess: () => {
                    toast.success(`#${selected} merged into #${ticket.ticketNumber}`);
                    onOpenChange(false);
                    setSelected(null);
                  },
                },
              )
            }
          >
            {merge.isPending ? "Merging…" : "Merge tickets"}
          </DetailPrimaryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
