import type { Icon } from "@phosphor-icons/react";
import {
  ArrowBendUpLeftIcon,
  CheckCircleIcon,
  CommandIcon,
  FlagIcon,
  KeyboardIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SidebarSimpleIcon,
  TagIcon,
  UserCircleIcon,
} from "@phosphor-icons/react/dist/ssr";

/**
 * The action list. Every command agents can run is defined here once; the
 * command menu lists the ones currently available and the keyboard shortcut
 * dispatcher triggers them, so both always agree on names and keys.
 *
 * Handlers are registered at runtime by whichever screen can perform the
 * action (see `useRegisterAction`), so "Reply" only exists while a ticket is open.
 */

export type ActionGroup = "General" | "Ticket";

export interface ActionDefinition {
  label: string;
  group: ActionGroup;
  icon: Icon;
  /** Key binding: a single key ("r", "?", "/") or "mod+<key>" for Ctrl/⌘. */
  shortcut?: string;
  /** Extra words the command menu matches on. */
  keywords?: readonly string[];
  /** Listed in the command menu (some actions only make sense as shortcuts). */
  inMenu?: boolean;
}

const DEFINITIONS = {
  "create-ticket": { label: "Create ticket", group: "General", icon: PlusIcon, shortcut: "c", keywords: ["new"], inMenu: true },
  "open-command-menu": { label: "Quick actions", group: "General", icon: CommandIcon, shortcut: "mod+k" },
  search: { label: "Search tickets", group: "General", icon: MagnifyingGlassIcon, shortcut: "/", keywords: ["find"], inMenu: true },
  "shortcut-help": { label: "Keyboard shortcuts", group: "General", icon: KeyboardIcon, shortcut: "?", keywords: ["help", "keys"], inMenu: true },
  "toggle-sidebar": { label: "Toggle sidebar", group: "General", icon: SidebarSimpleIcon, keywords: ["collapse", "expand"], inMenu: true },
  reply: { label: "Reply", group: "Ticket", icon: ArrowBendUpLeftIcon, shortcut: "r", keywords: ["respond", "answer"], inMenu: true },
  "internal-note": { label: "Internal note", group: "Ticket", icon: LockSimpleIcon, shortcut: "n", keywords: ["comment", "private"], inMenu: true },
  assign: { label: "Assign ticket", group: "Ticket", icon: UserCircleIcon, shortcut: "a", keywords: ["owner", "agent"], inMenu: true },
  "change-status": { label: "Change status", group: "Ticket", icon: CheckCircleIcon, shortcut: "s", keywords: ["resolve", "close", "pending"], inMenu: true },
  "change-priority": { label: "Change priority", group: "Ticket", icon: FlagIcon, keywords: ["urgent", "high"], inMenu: true },
  "add-tag": { label: "Add tag", group: "Ticket", icon: TagIcon, keywords: ["label"], inMenu: true },
} as const satisfies Record<string, ActionDefinition>;

export type ActionId = keyof typeof DEFINITIONS;
export const ACTIONS: Record<ActionId, ActionDefinition> = DEFINITIONS;
export const ACTION_IDS = Object.keys(ACTIONS) as ActionId[];

/** Display form of a shortcut: "mod+k" → "⌘ K" on Apple devices, "Ctrl K" elsewhere. */
export function formatShortcut(shortcut: string, apple: boolean): string[] {
  return shortcut.split("+").map((part) => (part === "mod" ? (apple ? "⌘" : "Ctrl") : part.toUpperCase()));
}
