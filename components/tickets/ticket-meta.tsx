"use client";

import type { ReactNode } from "react";
import { CaretDownIcon, FileTextIcon } from "@phosphor-icons/react/dist/ssr";
import { DetailCard, Field } from "@/components/shared/desk-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { TimeLabel } from "@/components/shared/time-label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLookups } from "@/hooks/use-tickets";
import { CATEGORY_LABEL, PRIORITY_META, STATUS_META, TYPE_LABEL } from "@/lib/ticket-meta";
import { TICKET_CATEGORIES, TICKET_TYPES, type Ticket, type TicketCategory, type TicketType } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { AssigneeMenuItems, PriorityMenuItems, StatusMenuItems, useTicketActions } from "./ticket-actions";
import { TicketSourceBadge } from "./ticket-source-badge";

/** Compact select-style control: current value + caret, opens a menu of choices. */
export const propertyControl =
  "inline-flex h-8 max-w-full min-w-0 items-center gap-2 rounded-lg border border-line bg-card px-2.5 text-[13px] font-medium text-ink transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action data-[state=open]:border-desk";

function PropertyMenu({ label, value, children, width = "w-48" }: { label: string; value: ReactNode; children: ReactNode; width?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={propertyControl} aria-label={`${label}. Change ${label.toLowerCase()}`}>
        <span className="flex min-w-0 items-center gap-2 truncate">{value}</span>
        <CaretDownIcon size={12} aria-hidden className="shrink-0 text-ink-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={cn("max-h-[60vh] overflow-y-auto", width)}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Ticket properties, each editable in place — no separate edit form. */
export function TicketProperties({ ticket }: { ticket: Ticket }) {
  const actions = useTicketActions(ticket);
  const { data: lookups } = useLookups();
  const status = STATUS_META[ticket.status];
  const priority = PRIORITY_META[ticket.priority];
  const set = (patch: { type?: TicketType; category?: TicketCategory }, label: string) => actions.update(patch, `#${ticket.ticketNumber} ${label}`);

  return (
    <DetailCard icon={FileTextIcon} title="Properties">
      <dl className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
        <Field label="Status">
          <PropertyMenu label={`Status: ${status.label}`} value={<><span className={cn("size-2 shrink-0 rounded-full", status.dot)} aria-hidden />{status.label}</>}>
            <StatusMenuItems value={ticket.status} onChange={actions.setStatus} />
          </PropertyMenu>
        </Field>
        <Field label="Priority">
          <PropertyMenu label={`Priority: ${priority.label}`} value={<><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: priority.color }} aria-hidden />{priority.label}</>}>
            <PriorityMenuItems value={ticket.priority} onChange={actions.setPriority} />
          </PropertyMenu>
        </Field>
        <Field label="Assignee">
          <PropertyMenu
            width="w-64"
            label={`Assignee: ${ticket.assignee?.name ?? "Unassigned"}`}
            value={
              <>
                <PersonAvatar name={ticket.assignee?.name ?? null} src={ticket.assignee?.avatar} size="xs" />
                <span className={cn("truncate", !ticket.assignee && "text-ink-muted")}>{ticket.assignee?.name ?? "Unassigned"}</span>
              </>
            }
          >
            <AssigneeMenuItems ticket={ticket} onAssign={actions.assign} />
          </PropertyMenu>
        </Field>
        <Field label="Team">
          <PropertyMenu label={`Team: ${ticket.team.name}`} value={<span className="truncate">{ticket.team.name}</span>} width="w-56">
            <DropdownMenuRadioGroup value={ticket.team.id} onValueChange={actions.setTeam}>
              {(lookups?.teams ?? []).map((t) => (
                <DropdownMenuRadioItem key={t.id} value={t.id}>
                  {t.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </PropertyMenu>
        </Field>
        <Field label="Type">
          <PropertyMenu label={`Type: ${TYPE_LABEL[ticket.type]}`} value={TYPE_LABEL[ticket.type]}>
            <DropdownMenuRadioGroup value={ticket.type} onValueChange={(v) => set({ type: v as TicketType }, `type set to ${TYPE_LABEL[v as TicketType]}`)}>
              {TICKET_TYPES.map((t) => (
                <DropdownMenuRadioItem key={t} value={t}>
                  {TYPE_LABEL[t]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </PropertyMenu>
        </Field>
        <Field label="Category">
          <PropertyMenu label={`Category: ${CATEGORY_LABEL[ticket.category]}`} value={CATEGORY_LABEL[ticket.category]}>
            <DropdownMenuRadioGroup
              value={ticket.category}
              onValueChange={(v) => set({ category: v as TicketCategory }, `category set to ${CATEGORY_LABEL[v as TicketCategory]}`)}
            >
              {TICKET_CATEGORIES.map((c) => (
                <DropdownMenuRadioItem key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </PropertyMenu>
        </Field>
        <Field label="Channel">
          <TicketSourceBadge source={ticket.source} className="text-ink" />
        </Field>
        <Field label="Requester">{ticket.contact.name}</Field>
        <Field label="Created">
          <TimeLabel iso={ticket.createdAt} mode="timestamp" />
        </Field>
        <Field label="Updated">
          <TimeLabel iso={ticket.updatedAt} />
        </Field>
        <Field label="Followers">
          {ticket.followers.length ? ticket.followers.map((f) => f.name).join(", ") : <span className="text-ink-muted">None</span>}
        </Field>
      </dl>
    </DetailCard>
  );
}
