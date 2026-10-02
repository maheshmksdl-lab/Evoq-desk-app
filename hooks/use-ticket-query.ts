"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ticketListHref } from "@/lib/ticket-routes";
import {
  EMPTY_FILTERS,
  FILTER_KEYS,
  parseTicketQuery,
  type TicketFilters,
  type TicketQuery,
  type TicketView,
} from "@/lib/schemas/ticket";

/**
 * Ticket list state lives in the URL (view, search, filters, sort, page),
 * so views are shareable, survive refresh, and work with back/forward.
 * On an inbox route the view comes from the path (`fixedView`); switching
 * to another view navigates to that view's own route.
 */
export function useTicketQuery(fixedView?: TicketView) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(() => {
    const parsed = parseTicketQuery(new URLSearchParams(searchParams.toString()));
    return fixedView ? { ...parsed, view: fixedView } : parsed;
  }, [searchParams, fixedView]);

  const setQuery = useCallback(
    (patch: Partial<TicketQuery>, opts: { keepPage?: boolean } = {}) => {
      const next = { ...query, ...patch };
      if (!opts.keepPage && !("page" in patch)) next.page = 1;
      const href = ticketListHref(next);
      // A new view is a new place (history entry); refining the current one isn't.
      if (href.split("?")[0] !== pathname) router.push(href);
      else router.replace(href, { scroll: false });
    },
    [query, router, pathname],
  );

  const filters: TicketFilters = useMemo(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, query[k]])) as TicketFilters,
    [query],
  );

  const setFilters = useCallback((next: TicketFilters) => setQuery(next), [setQuery]);
  const clearFilters = useCallback(() => setQuery({ ...EMPTY_FILTERS }), [setQuery]);

  return { query, setQuery, filters, setFilters, clearFilters };
}
