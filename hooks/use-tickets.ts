"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getLookups, getOverview, getViewCounts, listTickets, searchDesk } from "@/lib/api/tickets";
import type { TicketQuery } from "@/lib/schemas/ticket";

export const ticketKeys = {
  all: ["tickets"] as const,
  lists: () => [...ticketKeys.all, "list"] as const,
  list: (query: TicketQuery) => [...ticketKeys.lists(), query] as const,
  counts: () => [...ticketKeys.all, "counts"] as const,
  overview: () => [...ticketKeys.all, "overview"] as const,
  detail: (id: string) => [...ticketKeys.all, "detail", id.toUpperCase()] as const,
  search: (q: string) => ["search", q] as const,
  lookups: ["lookups"] as const,
};

export function useTickets(query: TicketQuery) {
  return useQuery({
    queryKey: ticketKeys.list(query),
    queryFn: () => listTickets(query),
    placeholderData: keepPreviousData,
    // Re-evaluates SLA states as clocks run.
    refetchInterval: 60_000,
  });
}

export function useViewCounts() {
  return useQuery({ queryKey: ticketKeys.counts(), queryFn: getViewCounts, refetchInterval: 60_000 });
}

/** The signed-in agent's day: counts, what needs attention, mentions. */
export function useOverview() {
  return useQuery({ queryKey: ticketKeys.overview(), queryFn: getOverview, refetchInterval: 60_000 });
}

export function useLookups() {
  return useQuery({ queryKey: ticketKeys.lookups, queryFn: getLookups, staleTime: Infinity });
}

export function useDeskSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: ticketKeys.search(term.toLowerCase()),
    queryFn: () => searchDesk(term),
    enabled: term.length > 0,
    placeholderData: keepPreviousData,
  });
}
