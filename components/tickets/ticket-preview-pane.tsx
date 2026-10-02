"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowSquareOutIcon,
  CaretDownIcon,
  EnvelopeSimpleIcon,
  FlagIcon,
  PhoneIcon,
  TagIcon,
  TicketIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailCard } from "@/components/shared/desk-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { useTicket } from "@/hooks/use-ticket";
import { SOURCE_LABEL, STATUS_META } from "@/lib/ticket-meta";
import type { Ticket } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { RelatedTickets } from "./related-tickets";
import { AssigneeMenuItems, PriorityMenuItems, StatusMenuItems, TagMenuItems, useTicketActions } from "./ticket-actions";
import { TicketActivity } from "./ticket-activity";
import { TicketComposer, type ComposerMode } from "./ticket-composer";
import { TicketCustomerPanel } from "./ticket-customer-panel";
import { TicketMessage } from "./ticket-message";
import { TicketMeta } from "./ticket-meta";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import { TicketSlaCard } from "./ticket-sla-card";
import { TicketTags } from "./ticket-tags";

type Tab = "conversation" | "details" | "customer" | "related" | "activity";

const pill =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 text-[13px] font-medium text-ink transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action data-[state=open]:border-desk";
const iconBtn =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-desk-depth-10 hover:text-ink focus-visible:outline-2 focus-visible:outline-desk-action data-[state=open]:bg-desk-depth-10";

/** Panel frame — sticks beside the list and scrolls on its own. */
function Frame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <aside
      aria-label={label}
      className="sticky top-[calc(var(--header-h)+24px)] flex h-[calc(100dvh-var(--header-h)-48px)] min-w-0 flex-col overflow-hidden rounded-2xl border border-line-soft bg-card shadow-card"
    >
      {children}
    </aside>
  );
}

/** Ticket workspace beside the list (wide screens): header controls, contact, tabs, thread and composer. */
export function TicketPreviewPane({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const { data: ticket, isPending, isError, refetch } = useTicket(ticketId);

  if (isPending) {
    return (
      <Frame label="Loading ticket">
        <div className="space-y-4 p-5" aria-busy="true">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </Frame>
    );
  }
  if (isError || !ticket) {
    return (
      <Frame label="Ticket">
        <div className="flex justify-end p-3">
          <button type="button" onClick={onClose} aria-label="Close ticket panel" className={iconBtn}>
            <XIcon size={18} aria-hidden />
          </button>
        </div>
        {isError ? (
          <ErrorState title="Unable to load ticket" hint="Please try again." action={<button type="button" onClick={() => refetch()} className={pill}>Try again</button>} />
        ) : (
          <EmptyState icon={TicketIcon} title="Ticket not found" hint={`We couldn't find a ticket with ID “${ticketId}”.`} />
        )}
      </Frame>
    );
  }
  return <PaneBody key={ticket.id} ticket={ticket} onClose={onClose} />;
}

function PaneBody({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const actions = useTicketActions(ticket);
  const [tab, setTab] = useState<Tab>("conversation");
  const [mode, setMode] = useState<ComposerMode>("public");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const status = STATUS_META[ticket.status];
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "conversation", label: "Conversation", count: ticket.messages.length },
    { key: "details", label: "Details" },
    { key: "customer", label: "Customer" },
    { key: "related", label: "Related", count: ticket.relatedTickets.length },
    { key: "activity", label: "Activity" },
  ];

  return (
    <Frame label={`Ticket #${ticket.ticketNumber}`}>
      {/* Header: identity + the controls agents reach for most */}
      <div className="shrink-0 border-b border-line-soft px-5 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold whitespace-nowrap text-ink-muted">#{ticket.ticketNumber}</span>
          <TicketPriorityBadge priority={ticket.priority} className="text-[12px]" />
          <div className="ml-auto flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger className={pill} aria-label={`Status: ${status.label}. Change status`}>
                <span className={cn("size-2 rounded-full", status.dot)} aria-hidden />
                {status.label}
                <CaretDownIcon size={12} aria-hidden className="text-ink-muted" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <StatusMenuItems value={ticket.status} onChange={actions.setStatus} />
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(pill, "max-w-[170px]")} aria-label={`Assignee: ${ticket.assignee?.name ?? "Unassigned"}. Change assignee`}>
                <PersonAvatar name={ticket.assignee?.name ?? null} src={ticket.assignee?.avatar} size="xs" />
                <span className={cn("truncate", !ticket.assignee && "text-ink-muted")}>{ticket.assignee?.name ?? "Assign"}</span>
                <CaretDownIcon size={12} aria-hidden className="shrink-0 text-ink-muted" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-[70vh] w-64 overflow-y-auto">
                <AssigneeMenuItems ticket={ticket} onAssign={actions.assign} />
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger className={iconBtn} aria-label="More actions">
                <span aria-hidden className="text-[18px] leading-none">⋯</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link href={`/tickets/${ticket.id}`}>
                    <ArrowSquareOutIcon size={15} aria-hidden /> Open full page
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FlagIcon size={15} aria-hidden /> Change priority
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-44">
                    <PriorityMenuItems value={ticket.priority} onChange={actions.setPriority} />
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <TagIcon size={15} aria-hidden /> Tags
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-[60vh] w-52 overflow-y-auto">
                    <TagMenuItems tags={ticket.tags} onToggle={actions.toggleTag} />
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
            <button type="button" onClick={onClose} aria-label="Close ticket panel" title="Close (Esc)" className={iconBtn}>
              <XIcon size={18} aria-hidden />
            </button>
          </div>
        </div>
        <h2 className="mt-2 text-[18px] leading-6 font-semibold text-ink">{ticket.subject}</h2>
        <p className="mt-1 text-[12px] text-ink-muted">
          Created <TimeLabel iso={ticket.createdAt} /> via {SOURCE_LABEL[ticket.source]} · Updated <TimeLabel iso={ticket.updatedAt} />
        </p>

        {/* Requester */}
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line-soft px-3 py-2.5">
          <PersonAvatar name={ticket.contact.name} src={ticket.contact.avatar} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">{ticket.contact.name}</p>
            <p className="truncate text-[12px] text-ink-muted">{ticket.customer.name}</p>
            <p className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-ink-body">
              <a href={`mailto:${ticket.contact.email}`} className="inline-flex min-w-0 items-center gap-1 hover:text-desk">
                <EnvelopeSimpleIcon size={13} aria-hidden className="shrink-0" />
                <span className="truncate">{ticket.contact.email}</span>
              </a>
              {ticket.contact.phone && (
                <span className="inline-flex items-center gap-1">
                  <PhoneIcon size={13} aria-hidden /> {ticket.contact.phone}
                </span>
              )}
            </p>
          </div>
          <button type="button" onClick={() => setTab("customer")} className={cn(pill, "shrink-0")}>
            View profile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Ticket sections" className="scrollbar-none flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-[13px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-desk-action",
              tab === t.key ? "border-desk font-semibold text-desk" : "border-transparent font-medium text-ink-body hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn("rounded-md px-1.5 text-[11px] leading-[18px]", tab === t.key ? "bg-desk-10 text-desk" : "bg-desk-depth-10 text-ink-muted")}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin" role="tabpanel">
        {tab === "conversation" && (
          <div className="flex flex-col gap-4 p-4">
            <ol className="flex flex-col gap-3" aria-label="Conversation">
              {ticket.messages.map((m, i) => (
                <TicketMessage key={m.id} message={m} isFirst={i === 0} />
              ))}
            </ol>
            <TicketComposer ticket={ticket} mode={mode} onModeChange={setMode} textareaRef={textareaRef} />
          </div>
        )}
        {tab === "details" && (
          <div className="flex flex-col gap-4 p-4">
            <TicketSlaCard sla={ticket.sla} status={ticket.status} />
            <TicketMeta ticket={ticket} />
            <DetailCard icon={TagIcon} title="Tags">
              <TicketTags ticketId={ticket.id} tags={ticket.tags} />
            </DetailCard>
          </div>
        )}
        {tab === "customer" && (
          <div className="p-4">
            <TicketCustomerPanel context={ticket.customerContext} />
          </div>
        )}
        {tab === "related" && (
          <div className="p-4">
            <RelatedTickets tickets={ticket.relatedTickets} empty="No related tickets linked." />
          </div>
        )}
        {tab === "activity" && (
          <div className="p-4">
            <TicketActivity activities={ticket.activities} />
          </div>
        )}
      </div>
    </Frame>
  );
}
