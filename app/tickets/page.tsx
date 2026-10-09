import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TicketList } from "@/components/tickets/ticket-list";
import { TicketListFallback } from "@/components/tickets/ticket-list-fallback";
import { parseTicketQuery } from "@/lib/schemas/ticket";
import { inboxSlugForView, ticketListHref } from "@/lib/ticket-routes";

export const metadata: Metadata = { title: "Tickets" };

export default async function TicketsPage({ searchParams }: PageProps<"/tickets">) {
  // Views with an inbox route live there; old /tickets?view=mine links redirect, keeping their filters.
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") params.set(k, v);
  const query = parseTicketQuery(params);
  if (inboxSlugForView(query.view)) redirect(ticketListHref(query));

  return (
    // The list reads its state from the URL, so it renders on the client inside Suspense.
    <Suspense fallback={<TicketListFallback />}>
      <TicketList />
    </Suspense>
  );
}
