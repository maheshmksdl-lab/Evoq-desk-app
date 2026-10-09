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
  /** Icon colour when the queue needs attention. */
  tone?: "orange" | "red";
  view: TicketView;
}

export const OVERVIEW: NavItem = { label: "Overview", href: "/overview", icon: HouseIcon, available: true };

export const INBOX: NavItem = { label: "Inbox", href: "/inbox/my-tickets", icon: TrayIcon, available: true };

export const INBOX_QUEUES: InboxQueue[] = [
  { label: "My tickets", icon: UserIcon, view: "mine" },
  { label: "Unassigned", icon: UserCircleDashedIcon, view: "unassigned" },
  { label: "Team", icon: UsersIcon, view: "team" },
  { label: "SLA at risk", icon: ClockIcon, tone: "orange", view: "sla_at_risk" },
  { label: "Waiting for customer", icon: ChatCircleDotsIcon, tone: "red", view: "pending" },
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
