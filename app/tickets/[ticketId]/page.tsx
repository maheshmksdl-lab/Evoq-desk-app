import type { Metadata } from "next";
import { TicketDetail } from "@/components/tickets/ticket-detail";

export async function generateMetadata({ params }: PageProps<"/tickets/[ticketId]">): Promise<Metadata> {
  const { ticketId } = await params;
  return { title: `#${decodeURIComponent(ticketId).toUpperCase()}` };
}

export default async function TicketPage({ params }: PageProps<"/tickets/[ticketId]">) {
  const { ticketId } = await params;
  // key: a fresh workspace (composer, tabs) per ticket when navigating between tickets.
  return <TicketDetail key={ticketId} ticketId={decodeURIComponent(ticketId)} />;
}
