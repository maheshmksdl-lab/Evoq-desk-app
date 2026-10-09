import type { TicketQuery, TicketView } from "@/lib/schemas/ticket";

/**
 * Where each ticket view lives. Inbox queues have their own routes
 * (/inbox/my-tickets…); every other view is /tickets?view=…. Views are filter
 * configurations, so both routes render the same ticket workspace.
 */

export const INBOX_QUEUES = {
  "my-tickets": "mine",
  unassigned: "unassigned",
  team: "team",
  open: "open",
  new: "new",
  waiting: "pending",
  "sla-at-risk": "sla_at_risk",
  recent: "recent",
} as const satisfies Record<string, TicketView>;

export type InboxSlug = keyof typeof INBOX_QUEUES;
export const INBOX_SLUGS = Object.keys(INBOX_QUEUES) as InboxSlug[];
export const DEFAULT_INBOX: InboxSlug = "open";

export function isInboxSlug(slug: string): slug is InboxSlug {
  return slug in INBOX_QUEUES;
}

export function inboxSlugForView(view: TicketView): InboxSlug | undefined {
  return INBOX_SLUGS.find((slug) => INBOX_QUEUES[slug] === view);
}

/** The route a view lives on: its inbox route, or the ticket workspace. */
export function viewPath(view: TicketView): string {
  const slug = inboxSlugForView(view);
  return slug ? `/inbox/${slug}` : "/tickets";
}

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

/** Full link for a list query — the view goes in the path when it has an inbox route. */
export function ticketListHref(query: Partial<TicketQuery>): string {
  const view = query.view ?? "all";
  const path = viewPath(view);
  const qs = ticketQueryToParams(path === "/tickets" ? query : { ...query, view: undefined }).toString();
  return qs ? `${path}?${qs}` : path;
}

export function ticketViewHref(view: TicketView): string {
  return ticketListHref({ view });
}

/**
 * A ticket's address: /tickets/<id>, plus the list query it was opened from
 * (view, filters…) so a refresh or shared link restores the same queue beside it.
 * There is no ticket page — the Inbox renders this URL with the ticket open.
 */
export function ticketHref(id: string, query: Partial<TicketQuery> = {}): string {
  const qs = ticketQueryToParams({ ...query, open: undefined }).toString();
  return `/tickets/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`;
}

/** What the path says about the Inbox: the queue (/inbox/<slug>) or the open ticket (/tickets/<id>). */
export function parseTicketPath(pathname: string): { view?: TicketView; ticketId?: string } {
  const [, root, segment] = pathname.split("/");
  if (root === "inbox" && segment && isInboxSlug(segment)) return { view: INBOX_QUEUES[segment] };
  if (root === "tickets" && segment) return { ticketId: decodeURIComponent(segment).toUpperCase() };
  return {};
}
