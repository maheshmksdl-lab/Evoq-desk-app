import { Suspense } from "react";
import type { Metadata } from "next";
import { TicketList } from "@/components/tickets/ticket-list";
import { TicketListFallback } from "@/components/tickets/ticket-list-fallback";
import { VIEW_META } from "@/components/tickets/ticket-views-config";
import { INBOX_QUEUES, INBOX_SLUGS, type InboxSlug } from "@/lib/ticket-routes";

// Only the known queues exist; anything else under /inbox is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return INBOX_SLUGS.map((queue) => ({ queue }));
}

export async function generateMetadata({ params }: PageProps<"/inbox/[queue]">): Promise<Metadata> {
  const { queue } = await params;
  return { title: VIEW_META[INBOX_QUEUES[queue as InboxSlug]].label };
}

/** One inbox queue — the shared ticket workspace with its view fixed by the route. */
export default async function InboxQueuePage({ params }: PageProps<"/inbox/[queue]">) {
  const { queue } = await params;
  return (
    // The list reads filters from the URL, so it renders on the client inside Suspense.
    <Suspense fallback={<TicketListFallback />}>
      <TicketList view={INBOX_QUEUES[queue as InboxSlug]} />
    </Suspense>
  );
}
