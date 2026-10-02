import type { Icon } from "@phosphor-icons/react";
import {
  CheckCircleIcon,
  CircleDashedIcon,
  FlagIcon,
  HourglassIcon,
  PauseCircleIcon,
  SealWarningIcon,
  TicketIcon,
  TimerIcon,
  TrayIcon,
  UserCircleIcon,
  UsersIcon,
  ArchiveIcon,
  ClockCounterClockwiseIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { TicketView } from "@/lib/schemas/ticket";

export interface ViewMeta {
  label: string;
  description: string;
  icon: Icon;
  empty: { title: string; hint: string };
}

export const VIEW_META: Record<TicketView, ViewMeta> = {
  all: {
    label: "All Tickets",
    description: "Every ticket across all teams.",
    icon: TicketIcon,
    empty: { title: "No tickets yet", hint: "New customer requests will appear here." },
  },
  mine: {
    label: "My Tickets",
    description: "Unresolved tickets assigned to you.",
    icon: UserCircleIcon,
    empty: { title: "Nothing assigned to you", hint: "You're all caught up. Pick up an unassigned ticket to help the team." },
  },
  unassigned: {
    label: "Unassigned",
    description: "Unresolved tickets waiting for an owner.",
    icon: CircleDashedIcon,
    empty: { title: "No unassigned tickets", hint: "You're all caught up — every ticket has an owner." },
  },
  team: {
    label: "Team",
    description: "Unresolved tickets for your team.",
    icon: UsersIcon,
    empty: { title: "Nothing open for your team", hint: "Your team's queue is clear." },
  },
  open: {
    label: "All Open",
    description: "Every open ticket waiting on the support team.",
    icon: TrayIcon,
    empty: { title: "No open tickets", hint: "Nothing is waiting on the support team right now." },
  },
  pending: {
    label: "Waiting",
    description: "Waiting for the customer to respond.",
    icon: HourglassIcon,
    empty: { title: "No pending tickets", hint: "No tickets are waiting on customers." },
  },
  on_hold: {
    label: "On Hold",
    description: "Paused while waiting on a third party or internal team.",
    icon: PauseCircleIcon,
    empty: { title: "No tickets on hold", hint: "Nothing is blocked on another team." },
  },
  resolved: {
    label: "Resolved",
    description: "Solved and awaiting customer confirmation.",
    icon: CheckCircleIcon,
    empty: { title: "No resolved tickets", hint: "Resolved tickets will show here until they close." },
  },
  closed: {
    label: "Closed",
    description: "Completed tickets.",
    icon: ArchiveIcon,
    empty: { title: "No closed tickets", hint: "Closed tickets will appear here." },
  },
  high_priority: {
    label: "High Priority",
    description: "Unresolved High and Urgent tickets.",
    icon: FlagIcon,
    empty: { title: "No high-priority tickets", hint: "Nothing urgent needs attention right now." },
  },
  sla_at_risk: {
    label: "SLA At Risk",
    description: "Response or resolution targets due soon.",
    icon: TimerIcon,
    empty: { title: "No SLAs at risk", hint: "Every active ticket is comfortably within target." },
  },
  recent: {
    label: "Recently Updated",
    description: "Tickets with activity in the last 24 hours.",
    icon: ClockCounterClockwiseIcon,
    empty: { title: "Nothing updated today", hint: "Tickets with activity in the last 24 hours appear here." },
  },
  overdue: {
    label: "Overdue",
    description: "SLA targets already missed.",
    icon: SealWarningIcon,
    empty: { title: "No overdue tickets", hint: "You're all caught up — no SLA targets have been missed." },
  },
};

/** Views shown as tabs above the list; the rest live under "More views". */
export const PRIMARY_VIEWS: TicketView[] = ["all", "mine", "unassigned", "high_priority", "sla_at_risk", "overdue"];
export const STATUS_VIEWS: TicketView[] = ["open", "pending", "on_hold", "resolved", "closed"];

