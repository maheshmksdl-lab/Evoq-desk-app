import { Suspense } from "react";
import type { Metadata } from "next";
import { TicketList } from "@/components/tickets/ticket-list";
import { TicketListFallback } from "@/components/tickets/ticket-list-fallback";

export async function generateMetadata({ params }: PageProps<"/tickets/[ticketId]">): Promise<Metadata> {
  const { ticketId } = await params;
  return { title: `#${decodeURIComponent(ticketId).toUpperCase()}` };
}

/**
 * A ticket link. Tickets have no page of their own: this renders the Inbox
 * (queue from `?view=…`, All tickets by default) with the ticket open in its
 * workspace — the same screen agents reach by selecting it from a queue.
 */
export default function TicketPage() {
  return (
    // The Inbox reads the ticket and queue from the URL, so it renders on the client inside Suspense.
    <Suspense fallback={<TicketListFallback />}>
      <TicketList />
    </Suspense>
  );
}
