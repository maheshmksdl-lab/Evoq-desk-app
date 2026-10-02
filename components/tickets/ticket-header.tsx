"use client";

import { useState } from "react";
import {
  ArrowBendUpLeftIcon,
  CaretDownIcon,
  CheckCircleIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  FlagIcon,
  GitMergeIcon,
  LinkSimpleIcon,
  TagIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
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
import { Breadcrumb, DetailPrimaryButton, IconButtonOutline, SecondaryButton } from "@/components/shared/desk-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { TimeLabel } from "@/components/shared/time-label";
import { useUpdateTicket } from "@/hooks/use-ticket";
import { CURRENT_AGENT_ID } from "@/lib/mock-data/agents";
import { SOURCE_LABEL, STATUS_META } from "@/lib/ticket-meta";
import type { Ticket } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { AssigneeMenuItems, PriorityMenuItems, StatusMenuItems, TagMenuItems, useTicketActions } from "./ticket-actions";
import { TicketMergeDialog } from "./ticket-merge-dialog";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import { TicketStatusBadge } from "./ticket-status-badge";

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error(`Couldn't copy ${what.toLowerCase()}`);
  }
}

/** Breadcrumb + one compact identity line — not a hero (ServiceOps work order detail). */
export function TicketIdentity({ ticket }: { ticket: Ticket }) {
  const following = ticket.followers.some((f) => f.id === CURRENT_AGENT_ID);
  return (
    <>
      <Breadcrumb homeIcon items={[{ label: "Tickets", href: "/tickets" }, { label: `#${ticket.ticketNumber}` }]} />
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-h1 font-bold text-ink sm:text-[22px] sm:leading-[30px]">{ticket.subject}</h1>
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
        <p className="text-body text-ink-body">
          <span>#{ticket.ticketNumber}</span>
          <button
            type="button"
            onClick={() => copy(ticket.ticketNumber, "Ticket ID")}
            aria-label="Copy ticket ID"
            className="mx-0.5 inline-flex size-6 items-center justify-center rounded align-middle text-ink-muted hover:bg-desk-tint hover:text-desk"
          >
            <CopyIcon size={13} aria-hidden />
          </button>
          <span>
            · <span className="text-ink">{ticket.customer.name}</span> · {ticket.contact.name} · via {SOURCE_LABEL[ticket.source]} · Opened{" "}
            <TimeLabel iso={ticket.createdAt} />
          </span>
          {following && (
            <span className="ml-2 inline-flex items-center gap-1 text-desk">
              <EyeIcon size={14} aria-hidden /> Following
            </span>
          )}
        </p>
      </div>
    </>
  );
}

/** Tab-row actions: Reply (primary), Assign, Status, ⋮ more. */
export function TicketHeaderActions({ ticket, onReply }: { ticket: Ticket; onReply: () => void }) {
  const actions = useTicketActions(ticket);
  const update = useUpdateTicket();
  const [mergeOpen, setMergeOpen] = useState(false);
  const following = ticket.followers.some((f) => f.id === CURRENT_AGENT_ID);
  const statusMeta = STATUS_META[ticket.status];

  return (
    <>
      <DetailPrimaryButton icon={ArrowBendUpLeftIcon} onClick={onReply}>
        Reply
      </DetailPrimaryButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SecondaryButton className="max-w-[210px]" aria-label={`Assignee: ${ticket.assignee?.name ?? "Unassigned"}. Change assignee`}>
            <PersonAvatar name={ticket.assignee?.name ?? null} src={ticket.assignee?.avatar} size="xs" />
            <span className={cn("truncate", !ticket.assignee && "text-ink-muted")}>{ticket.assignee?.name ?? "Assign"}</span>
            <CaretDownIcon size={12} aria-hidden className="shrink-0 text-ink-muted" />
          </SecondaryButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[70vh] w-64 overflow-y-auto">
          <AssigneeMenuItems ticket={ticket} onAssign={actions.assign} />
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SecondaryButton aria-label={`Status: ${statusMeta.label}. Change status`}>
            <span className={cn("size-2 rounded-full", statusMeta.dot)} aria-hidden />
            {statusMeta.label}
            <CaretDownIcon size={12} aria-hidden className="text-ink-muted" />
          </SecondaryButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <StatusMenuItems value={ticket.status} onChange={actions.setStatus} />
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButtonOutline aria-label="More actions">
            <DotsThreeVerticalIcon size={20} weight="bold" aria-hidden />
          </IconButtonOutline>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FlagIcon size={15} weight="duotone" aria-hidden /> Change priority
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              <PriorityMenuItems value={ticket.priority} onChange={actions.setPriority} />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <TagIcon size={15} weight="duotone" aria-hidden /> Add tag
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[60vh] w-52 overflow-y-auto">
              <TagMenuItems tags={ticket.tags} onToggle={actions.toggleTag} />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onSelect={() => setMergeOpen(true)} disabled={ticket.status === "closed"}>
            <GitMergeIcon size={15} weight="duotone" aria-hidden /> Merge…
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              update.mutate(
                { id: ticket.id, patch: { following: !following } },
                { onSuccess: () => toast.success(following ? "You've stopped following this ticket" : "You'll be notified about updates to this ticket") },
              )
            }
          >
            {following ? <EyeSlashIcon size={15} weight="duotone" aria-hidden /> : <EyeIcon size={15} weight="duotone" aria-hidden />}
            {following ? "Unfollow" : "Follow"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copy(window.location.href, "Link")}>
            <LinkSimpleIcon size={15} weight="duotone" aria-hidden /> Copy link
          </DropdownMenuItem>
          {ticket.status !== "resolved" && ticket.status !== "closed" && (
            <DropdownMenuItem onSelect={() => actions.setStatus("resolved")}>
              <CheckCircleIcon size={15} weight="duotone" aria-hidden /> Resolve
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={ticket.status === "closed"} onSelect={() => actions.setStatus("closed")}>
            <XCircleIcon size={15} weight="duotone" aria-hidden /> Close ticket
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {mergeOpen && <TicketMergeDialog ticket={ticket} open={mergeOpen} onOpenChange={setMergeOpen} />}
    </>
  );
}
