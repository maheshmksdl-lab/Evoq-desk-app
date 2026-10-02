"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  EMPTY_FILTERS,
  FILTER_KEYS,
  parseTicketQuery,
  type TicketFilters,
  type TicketQuery,
  type TicketView,
} from "@/lib/schemas/ticket";

const DEFAULTS: Pick<TicketQuery, "view" | "q" | "sort" | "page" | "size"> = {
  view: "all",
  q: "",
  sort: "updated_desc",
  page: 1,
  size: 25,
};

/** Serialises a query to URL params, leaving out defaults so links stay short. */
export function ticketQueryToParams(query: Partial<TicketQuery>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "" || (Array.isArray(value) && !value.length)) continue;
    if (key in DEFAULTS && DEFAULTS[key as keyof typeof DEFAULTS] === value) continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return params;
}

export function ticketViewHref(view: TicketView) {
  return view === "all" ? "/tickets" : `/tickets?view=${view}`;
}

/**
 * Ticket list state lives in the URL (view, search, filters, sort, page),
 * so views are shareable, survive refresh, and work with back/forward.
 */
export function useTicketQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = useMemo(() => parseTicketQuery(new URLSearchParams(searchParams.toString())), [searchParams]);

  const setQuery = useCallback(
    (patch: Partial<TicketQuery>, opts: { keepPage?: boolean } = {}) => {
      const next = { ...query, ...patch };
      if (!opts.keepPage && !("page" in patch)) next.page = 1;
      const qs = ticketQueryToParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
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
