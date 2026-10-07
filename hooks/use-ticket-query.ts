"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parseTicketPath, ticketHref, ticketListHref } from "@/lib/ticket-routes";
import {
  EMPTY_FILTERS,
  FILTER_KEYS,
  parseTicketQuery,
  type TicketFilters,
  type TicketQuery,
} from "@/lib/schemas/ticket";

/**
 * Inbox state lives in the URL, so queues and open tickets are shareable,
 * survive refresh, and work with back/forward:
 *   /inbox/<queue>?filters          a queue
 *   /tickets/<id>?view=…&filters    the same queue with that ticket open
 * The path wins over `?view` / `?open`. Changes go through the native History
 * API (which Next keeps in sync with usePathname / useSearchParams), so the
 * Inbox never remounts — opening, switching and closing tickets is instant.
 */
export function useTicketQuery() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(() => {
    const parsed = parseTicketQuery(new URLSearchParams(searchParams.toString()));
    const route = parseTicketPath(pathname);
    return { ...parsed, view: route.view ?? parsed.view, open: route.ticketId ?? parsed.open?.toUpperCase() };
  }, [searchParams, pathname]);

  const setQuery = useCallback(
    (patch: Partial<TicketQuery>, opts: { keepPage?: boolean } = {}) => {
      const next = { ...query, ...patch };
      if (!opts.keepPage && !("page" in patch)) next.page = 1;
      const href = next.open ? ticketHref(next.open, next) : ticketListHref(next);
      if (href === `${window.location.pathname}${window.location.search}`) return;
      // A new queue or ticket is a new place (history entry); refining the current one isn't.
      const place = next.view !== query.view || next.open !== query.open;
      window.history[place ? "pushState" : "replaceState"](null, "", href);
    },
    [query],
  );

  const filters: TicketFilters = useMemo(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, query[k]])) as TicketFilters,
    [query],
  );

  const setFilters = useCallback((next: TicketFilters) => setQuery(next), [setQuery]);
  const clearFilters = useCallback(() => setQuery({ ...EMPTY_FILTERS }), [setQuery]);
  /** Opens a ticket in the workspace (or closes it with `undefined`), keeping the queue as it is. */
  const openTicket = useCallback((id: string | undefined) => setQuery({ open: id?.toUpperCase() }, { keepPage: true }), [setQuery]);

  return { query, setQuery, filters, setFilters, clearFilters, openTicket };
}
