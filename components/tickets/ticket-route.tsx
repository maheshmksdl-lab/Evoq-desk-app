"use client";

import { useTicketQuery } from "@/hooks/use-ticket-query";
import { inboxSlugForView } from "@/lib/ticket-routes";
import { InboxView } from "./inbox-view";
import { TicketList } from "./ticket-list";

/**
 * Inbox queues (/inbox/<queue>, or a ticket opened from one) get the Inbox's
 * conversation layout; every other view keeps the ticket table. Decided from
 * the URL, so switching views in place swaps the layout without a navigation.
 */
export function TicketRoute() {
  const { query } = useTicketQuery();
  return inboxSlugForView(query.view) ? <InboxView /> : <TicketList />;
}
