import type { Icon } from "@phosphor-icons/react";
import {
  BookOpenIcon,
  ChartLineUpIcon,
  ChatCircleDotsIcon,
  ClockCounterClockwiseIcon,
  ClockIcon,
  GearSixIcon,
  HouseIcon,
  RobotIcon,
  TicketIcon,
  TrayIcon,
  UserIcon,
  UserCircleDashedIcon,
  UsersIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { TicketView } from "@/lib/schemas/ticket";

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
  /** Modules not built yet don't navigate (no placeholder pages); they explain themselves on hover. */
  available: boolean;
}

/** A queue under Inbox — a ticket list link, with a count when it maps to a view. */
export interface InboxQueue {
  label: string;
  icon: Icon;
  /** Icon colour when the queue needs attention. */
  tone?: "orange" | "red";
  view?: TicketView;
  /** Extra list params for queues that are a filter rather than a view. */
  params?: Record<string, string>;
}

export const OVERVIEW: NavItem = { label: "Overview", href: "/overview", icon: HouseIcon, available: false };

export const INBOX: NavItem = { label: "Inbox", href: "/tickets?view=mine", icon: TrayIcon, available: true };

export const INBOX_QUEUES: InboxQueue[] = [
  { label: "My tickets", icon: UserIcon, view: "mine" },
  { label: "Unassigned", icon: UserCircleDashedIcon, view: "unassigned" },
  { label: "Team", icon: UsersIcon, view: "team" },
  { label: "SLA at risk", icon: ClockIcon, tone: "orange", view: "sla_at_risk" },
  { label: "Waiting for customer", icon: ChatCircleDotsIcon, tone: "red", view: "pending" },
  { label: "Recently updated", icon: ClockCounterClockwiseIcon, params: { updated: "today" } },
];

export const MAIN_ITEMS: NavItem[] = [
  { label: "Tickets", href: "/tickets", icon: TicketIcon, available: true },
  { label: "Customers", href: "/customers", icon: UsersThreeIcon, available: false },
  { label: "Knowledge", href: "/knowledge", icon: BookOpenIcon, available: false },
  { label: "Reports", href: "/reports", icon: ChartLineUpIcon, available: false },
  { label: "Automations", href: "/automations", icon: RobotIcon, available: false },
  { label: "Settings", href: "/settings", icon: GearSixIcon, available: false },
];

export function queueHref(q: InboxQueue) {
  const params = new URLSearchParams({ ...(q.view ? { view: q.view } : {}), ...q.params });
  return `/tickets?${params}`;
}

/** A queue is current when every one of its params matches the URL and no other view is set. */
export function isQueueActive(q: InboxQueue, pathname: string, params: URLSearchParams) {
  if (pathname !== "/tickets") return false;
  if ((params.get("view") ?? undefined) !== q.view) return false;
  return Object.entries(q.params ?? {}).every(([k, v]) => params.get(k) === v);
}
