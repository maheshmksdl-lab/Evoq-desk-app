import type { Icon } from "@phosphor-icons/react";
import {
  BookOpenTextIcon,
  BuildingsIcon,
  ChartBarIcon,
  GearSixIcon,
  PlugsConnectedIcon,
  TicketIcon,
  TrayIcon,
  UsersIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";

export interface NavItem {
  label: string;
  href: string;
  icon: Icon;
  /** Modules not built yet render as disabled "Soon" items — no placeholder pages. */
  available: boolean;
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

export const MAIN_GROUPS: NavGroup[] = [
  {
    label: "Desk",
    items: [
      { label: "Inbox", href: "/inbox", icon: TrayIcon, available: false },
      { label: "Tickets", href: "/tickets", icon: TicketIcon, available: true },
      { label: "Customers", href: "/customers", icon: BuildingsIcon, available: false },
      { label: "Knowledge Base", href: "/knowledge-base", icon: BookOpenTextIcon, available: false },
    ],
  },
  {
    label: "Reporting",
    items: [{ label: "Reports", href: "/reports", icon: ChartBarIcon, available: false }],
  },
];

/** Pinned to the bottom of the sidebar, above the profile card (ServiceOps layout). */
export const ADMIN_GROUP: NavGroup = {
  label: "Admin",
  items: [
    { label: "Users", href: "/admin/users", icon: UsersIcon, available: false },
    { label: "Teams", href: "/admin/teams", icon: UsersThreeIcon, available: false },
    { label: "Settings", href: "/admin/settings", icon: GearSixIcon, available: false },
    { label: "Integrations", href: "/admin/integrations", icon: PlugsConnectedIcon, available: false },
  ],
};
