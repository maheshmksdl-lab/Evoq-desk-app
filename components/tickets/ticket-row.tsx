"use client";

import { useRouter } from "next/navigation";
import { PencilSimpleLineIcon, UserCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { Checkbox } from "@/components/ui/checkbox";
import { PILL_TONE, type PillTone } from "@/components/shared/desk-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { TimeLabel } from "@/components/shared/time-label";
import { useNow } from "@/hooks/use-now";
import { formatFullDate } from "@/lib/format";
import { focusClock } from "@/lib/sla";
import { ACTIVE_STATUSES, PRIORITY_META, SLA_META, SOURCE_LABEL, STATUS_META } from "@/lib/ticket-meta";
import type { TicketSource, TicketSummary } from "@/lib/types/ticket";
import { ticketHref } from "@/lib/ticket-routes";
import { cn } from "@/lib/utils";
import { TicketRowActions } from "./ticket-actions";
import { TicketLink } from "./ticket-link";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import { SLA_ICON, slaClockText, TicketSlaIndicator } from "./ticket-sla-indicator";
import { SOURCE_ICON } from "./ticket-source-badge";
import { TicketStatusBadge } from "./ticket-status-badge";

const bodyCell = "px-3 border-b border-line-soft align-middle";

const needsReply = (t: TicketSummary) => t.awaiting === "agent" && ACTIVE_STATUSES.includes(t.status);

/** Channel tile tones — each inbound channel keeps one recognisable colour. */
const CHANNEL_TONE: Record<TicketSource, PillTone> = {
  email: "blue",
  web_form: "teal",
  chat: "purple",
  phone: "green",
  portal: "teal",
  api: "gray",
  social: "orange",
};

/** Brand record link (ticket #). */
export function TicketIdLink({ ticket, className }: { ticket: Pick<TicketSummary, "id" | "ticketNumber">; className?: string }) {
  return (
    <TicketLink
      ticketId={ticket.id}
      onClick={(e) => e.stopPropagation()}
      className={cn("text-table-cell font-semibold whitespace-nowrap text-desk hover:underline focus-visible:outline-2 focus-visible:outline-desk-action", className)}
    >
      #{ticket.ticketNumber}
    </TicketLink>
  );
}

/** Priority as a coloured dot; the label is kept for hover and screen readers. */
function PriorityDot({ priority }: { priority: TicketSummary["priority"] }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} title={`${meta.label} priority`}>
      <span className="sr-only">{meta.label} priority</span>
    </span>
  );
}

function ChannelTile({ source }: { source: TicketSource }) {
  const IconCmp = SOURCE_ICON[source];
  const tone = PILL_TONE[CHANNEL_TONE[source]];
  return (
    <span
      className="inline-flex size-7 items-center justify-center rounded-md"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
      title={`Via ${SOURCE_LABEL[source]}`}
    >
      <IconCmp size={15} weight="duotone" aria-hidden />
      <span className="sr-only">Via {SOURCE_LABEL[source]}</span>
    </span>
  );
}

function Chip({ tone, children }: { tone: PillTone; children: string }) {
  const m = PILL_TONE[tone];
  return (
    <span className="inline-flex rounded-md px-2 py-0.5 text-[12px] leading-4 font-medium whitespace-nowrap" style={{ backgroundColor: m.bg, color: m.fg }}>
      {children}
    </span>
  );
}

/**
 * SLA column: the running clock while the team owes work; otherwise the reason
 * it isn't running — "Waiting" on the customer, "On Hold", or the closed state.
 */
function SlaCell({ ticket }: { ticket: TicketSummary }) {
  const now = useNow();
  if (ticket.status === "pending") return <Chip tone="amber">Waiting</Chip>;
  if (ticket.status !== "open") return <Chip tone={STATUS_META[ticket.status].tone}>{STATUS_META[ticket.status].label}</Chip>;
  const focus = focusClock(ticket.sla);
  const IconCmp = SLA_ICON[focus.state];
  const tone = focus.state === "breached" ? "text-[#DC2626]" : focus.state === "at_risk" ? "text-[#EA580C]" : "text-ink-body";
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap", tone)}
      title={`${focus.label} target: ${formatFullDate(focus.due)}`}
    >
      <IconCmp size={15} weight={focus.state === "on_track" ? "regular" : "fill"} aria-hidden className="shrink-0" />
      {slaClockText(focus.state, focus.due, now)}
      <span className="sr-only">
        {" "}
        · {focus.label} · {SLA_META[focus.state].label}
      </span>
    </span>
  );
}

/**
 * Column visibility follows the list's own width (container queries on the
 * table wrapper), so the table adapts both full-width and beside an open ticket.
 */
export const LIST_COLS = {
  /** Priority dot + ticket #, as its own column on a wide list. */
  number: "hidden @4xl:table-cell",
  /** …and inside the subject cell on a narrow one, so the subject keeps its width. */
  numberInline: "@4xl:hidden",
  customer: "hidden @4xl:table-cell",
  /** Contact name in the ticket cell while the Customer column is hidden. */
  customerInline: "@4xl:hidden",
  updated: "hidden @2xl:table-cell",
  assigneeName: "@max-3xl:sr-only",
  typingBadge: "@3xl:hidden",
};

export type ListDensity = "comfortable" | "compact";

/**
 * Desktop / tablet row. The ticket # is a real link; clicking anywhere else opens
 * the ticket in the Inbox workspace (`onOpen`), or at its URL when there is none.
 */
export function TicketRow({
  ticket,
  selected,
  onToggleSelect,
  active,
  onOpen,
  onIntent,
  typing,
  density = "comfortable",
}: {
  ticket: TicketSummary;
  selected: boolean;
  onToggleSelect: () => void;
  /** The ticket open in the workspace beside the list. */
  active?: boolean;
  onOpen?: (id: string) => void;
  /** Hover: lets the Inbox prefetch the ticket before it is opened. */
  onIntent?: (id: string) => void;
  /** "Alex is replying…" when another agent is composing on this ticket. */
  typing?: string | null;
  density?: ListDensity;
}) {
  const router = useRouter();
  const href = ticketHref(ticket.id);
  const unread = needsReply(ticket);
  const cell = cn(bodyCell, density === "compact" ? "py-2" : "py-3", active && "border-desk/40 bg-desk-tint");

  return (
    <tr
      onClick={(e) => {
        // Ignore clicks from controls in the row and from portaled menus (React bubbles those here too).
        if (!e.currentTarget.contains(e.target as Node)) return;
        if ((e.target as HTMLElement).closest("a, button")) return;
        if (window.getSelection()?.toString()) return;
        if (onOpen) onOpen(ticket.id);
        else router.push(href);
      }}
      onPointerEnter={() => onIntent?.(ticket.id)}
      aria-current={active || undefined}
      data-ticket-id={ticket.id}
      className={cn(
        "group cursor-pointer transition-colors",
        // The open ticket reads as one outlined, tinted row.
        active
          ? "[&>td]:border-t [&>td:first-child]:rounded-l-lg [&>td:first-child]:border-l [&>td:last-child]:rounded-r-lg [&>td:last-child]:border-r"
          : selected
            ? "bg-desk-surface"
            : "hover:bg-desk-surface",
      )}
    >
      <td className={cn(cell, "w-10 pr-0 pl-5")}>
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label={`Select ticket #${ticket.ticketNumber}`} className="border-ink-faint bg-card" />
      </td>
      <td className={cn(cell, LIST_COLS.number, "w-[92px] pr-0")}>
        <span className="flex items-center gap-2.5">
          <PriorityDot priority={ticket.priority} />
          <TicketIdLink ticket={ticket} className={cn("text-[13px] group-hover:text-desk", active ? "text-desk" : "text-ink-muted")} />
        </span>
      </td>
      <td className={cn(cell, "w-full max-w-0")}>
        <p className={cn("flex items-center gap-2 text-[13px]", unread ? "font-semibold text-ink" : "font-medium text-ink-body")}>
          <span className={cn("flex", LIST_COLS.numberInline)}>
            <PriorityDot priority={ticket.priority} />
          </span>
          <span className="truncate">
            {unread && <span className="sr-only">Customer is waiting for a reply. </span>}
            {ticket.subject}
          </span>
        </p>
        <p className="truncate text-[12px] leading-4 text-ink-muted">
          <span className={LIST_COLS.numberInline}>
            <TicketIdLink ticket={ticket} className={cn("text-[12px]", active ? "text-desk" : "text-ink-muted")} /> ·{" "}
          </span>
          <span className={cn("font-medium text-ink-body", LIST_COLS.customerInline)}>{ticket.contact.name} · </span>
          {ticket.preview}
        </p>
      </td>
      <td className={cn(cell, LIST_COLS.customer)}>
        <div className="flex min-w-0 items-center gap-2.5">
          <PersonAvatar name={ticket.contact.name} src={ticket.contact.avatar} size="md" />
          <div className="min-w-0">
            <p className="max-w-[150px] truncate text-[13px] font-medium text-ink">{ticket.contact.name}</p>
            <p className="max-w-[150px] truncate text-[12px] leading-4 text-ink-muted">{ticket.customer.name}</p>
          </div>
        </div>
      </td>
      <td className={cn(cell, "text-center")}>
        <ChannelTile source={ticket.source} />
      </td>
      <td className={cell}>
        <SlaCell ticket={ticket} />
      </td>
      <td className={cn(cell, LIST_COLS.updated, "text-[12px] whitespace-nowrap text-ink-muted")}>
        <TimeLabel iso={ticket.updatedAt} />
      </td>
      <td className={cell}>
        <div className="flex min-w-0 items-center gap-2" title={[ticket.assignee?.name ?? "Unassigned", typing].filter(Boolean).join(" · ")}>
          <span className="relative shrink-0">
            <PersonAvatar name={ticket.assignee?.name ?? null} src={ticket.assignee?.avatar} size="sm" status={ticket.assignee?.status} />
            {typing && (
              <PencilSimpleLineIcon
                size={12}
                weight="fill"
                aria-hidden
                className={cn("absolute -top-1 -right-1.5 rounded-full bg-card p-px text-desk", LIST_COLS.typingBadge)}
              />
            )}
          </span>
          <div className={cn("min-w-0", LIST_COLS.assigneeName)}>
            <p className={cn("max-w-[130px] truncate text-[13px]", ticket.assignee ? "text-ink-body" : "text-ink-muted")}>{ticket.assignee?.name ?? "Unassigned"}</p>
            {typing && <p className="max-w-[150px] truncate text-[11px] leading-4 font-medium text-desk">{typing}</p>}
          </div>
        </div>
      </td>
      <td className={cn(cell, "w-12 pr-3 text-right")}>
        <TicketRowActions ticket={ticket} />
      </td>
    </tr>
  );
}

/**
 * One ticket as a card: the phone list, and the queue column beside an open
 * ticket workspace (where `active` marks the ticket being worked on).
 */
export function TicketCard({
  ticket,
  typing,
  active,
  onOpen,
  onIntent,
}: {
  ticket: TicketSummary;
  typing?: string | null;
  active?: boolean;
  onOpen?: (id: string) => void;
  /** Hover / focus: lets the Inbox prefetch the ticket before it is opened. */
  onIntent?: (id: string) => void;
}) {
  const router = useRouter();
  const sla = focusClock(ticket.sla);
  const urgentSla = sla.state === "at_risk" || sla.state === "breached";
  const open = () => (onOpen ? onOpen(ticket.id) : router.push(ticketHref(ticket.id)));
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={open}
      onPointerEnter={() => onIntent?.(ticket.id)}
      onFocus={() => onIntent?.(ticket.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") open();
      }}
      aria-current={active || undefined}
      aria-label={`Ticket #${ticket.ticketNumber}: ${ticket.subject}`}
      data-ticket-id={ticket.id}
      className={cn(
        "cursor-pointer border-b border-line-soft px-4 py-3.5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-desk-action active:bg-desk-tint",
        active ? "bg-desk-tint shadow-[inset_3px_0_0_var(--desk)]" : "hover:bg-desk-surface",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-ink-muted">
            <PriorityDot priority={ticket.priority} />#{ticket.ticketNumber}
          </p>
          <p className={cn("mt-0.5 line-clamp-2 text-[14px] text-ink", needsReply(ticket) ? "font-semibold" : "font-medium")}>{ticket.subject}</p>
          <p className="truncate text-[12px] text-ink-muted">
            {ticket.contact.name} · {ticket.customer.name}
          </p>
        </div>
        <TicketStatusBadge status={ticket.status} className="shrink-0" />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <TicketPriorityBadge priority={ticket.priority} />
        <span className="inline-flex min-w-0 items-center gap-1.5 text-caption text-ink-body">
          <UserCircleIcon size={14} aria-hidden className="shrink-0" />
          <span className="truncate">{ticket.assignee?.name ?? "Unassigned"}</span>
          <span aria-hidden>·</span>
          <TimeLabel iso={ticket.updatedAt} className="whitespace-nowrap" />
        </span>
      </div>
      {typing && <p className="mt-2 text-[12px] font-medium text-desk">{typing}</p>}
      {urgentSla && (
        <div className="mt-2 border-t border-line-soft pt-2">
          <TicketSlaIndicator sla={ticket.sla} className="flex-row items-center gap-1.5 [&>span:last-child]:before:content-['·_']" />
        </div>
      )}
    </div>
  );
}
