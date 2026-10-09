import type { Icon } from "@phosphor-icons/react";
import {
  BookOpenIcon,
  ChartLineUpIcon,
  ChatCircleDotsIcon,
  CircleIcon,
  ClockCounterClockwiseIcon,
  ClockIcon,
  GearSixIcon,
  HouseIcon,
  RobotIcon,
  SparkleIcon,
  TicketIcon,
  TrayIcon,
  UserIcon,
  UserCircleDashedIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { TicketView } from "@/lib/schemas/ticket";
import { viewPath } from "@/lib/ticket-routes";

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
  /** Modules not built yet don't navigate (no placeholder pages); they explain themselves on hover. */
  available: boolean;
}

/** A queue under Inbox — one ticket view on its own /inbox route, shown with its count. */
export interface InboxQueue {
  label: string;
  icon: Icon;
  view: TicketView;
  /** Show the queue's ticket count beside it. */
  counted?: boolean;
}

export const OVERVIEW: NavItem = { label: "Overview", href: "/overview", icon: HouseIcon, available: true };

export const INBOX: NavItem = { label: "Inbox", href: "/inbox/open", icon: TrayIcon, available: true };

export const INBOX_QUEUES: InboxQueue[] = [
  { label: "All open", icon: CircleIcon, view: "open", counted: true },
  { label: "New", icon: SparkleIcon, view: "new", counted: true },
  { label: "My tickets", icon: UserIcon, view: "mine", counted: true },
  { label: "Unassigned", icon: UserCircleDashedIcon, view: "unassigned", counted: true },
  { label: "SLA at risk", icon: ClockIcon, view: "sla_at_risk", counted: true },
  { label: "Waiting for customer", icon: ChatCircleDotsIcon, view: "pending", counted: true },
  { label: "Recently updated", icon: ClockCounterClockwiseIcon, view: "recent" },
];

export const MAIN_ITEMS: NavItem[] = [
  { label: "Tickets", href: "/tickets", icon: TicketIcon, available: true },
  { label: "Customers", href: "/customers", icon: UsersThreeIcon, available: false },
  { label: "Knowledge", href: "/knowledge", icon: BookOpenIcon, available: false },
  { label: "Reports", href: "/reports", icon: ChartLineUpIcon, available: false },
  { label: "Automations", href: "/automations", icon: RobotIcon, available: false },
  { label: "Settings", href: "/settings", icon: GearSixIcon, available: false },
];

export const queueHref = (q: InboxQueue) => viewPath(q.view);

/** The sidebar's name for an inbox view ("All open"), for the Inbox list title. */
export const queueLabel = (view: TicketView) => INBOX_QUEUES.find((q) => q.view === view)?.label;

/** A team's queue: its open tickets in the Inbox. */
export const teamHref = (teamId: string) => `${viewPath("open")}?team=${encodeURIComponent(teamId)}`;
