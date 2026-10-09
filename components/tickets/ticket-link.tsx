"use client";

import { createContext, useContext, type ComponentProps } from "react";
import Link from "next/link";
import { ticketHref } from "@/lib/ticket-routes";

/** Provided by the Inbox: opens a ticket in its workspace without leaving the queue. */
const OpenTicketContext = createContext<((id: string) => void) | null>(null);
export const OpenTicketProvider = OpenTicketContext.Provider;

/**
 * Link to a ticket. Inside the Inbox a plain click switches the workspace to
 * it; elsewhere (and for new-tab clicks) it's a normal link to /tickets/<id>,
 * which opens the Inbox with that ticket selected.
 */
export function TicketLink({ ticketId, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { ticketId: string }) {
  const open = useContext(OpenTicketContext);
  return (
    <Link
      href={ticketHref(ticketId)}
      onClick={(e) => {
        onClick?.(e);
        if (!open || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        open(ticketId);
      }}
      {...props}
    />
  );
}
