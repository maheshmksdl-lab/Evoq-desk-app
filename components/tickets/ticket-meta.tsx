"use client";

import { useState } from "react";
import { FileTextIcon } from "@phosphor-icons/react/dist/ssr";
import { DetailCard, EditButton, Field } from "@/components/shared/desk-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { TimeLabel } from "@/components/shared/time-label";
import { CATEGORY_LABEL, TYPE_LABEL } from "@/lib/ticket-meta";
import type { Ticket } from "@/lib/types/ticket";
import { TicketEditDrawer } from "./ticket-edit-drawer";
import { TicketPriorityBadge } from "./ticket-priority-badge";
import { TicketSourceBadge } from "./ticket-source-badge";
import { TicketStatusBadge } from "./ticket-status-badge";

/** Ticket properties as a definition list; Edit opens the side drawer. */
export function TicketMeta({ ticket }: { ticket: Ticket }) {
  const [editing, setEditing] = useState(false);
  return (
    <DetailCard icon={FileTextIcon} title="Ticket details" action={<EditButton onClick={() => setEditing(true)} />}>
      <dl className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-x-4 gap-y-3.5 sm:pl-2">
        <Field label="Ticket #">#{ticket.ticketNumber}</Field>
        <Field label="Status">
          <TicketStatusBadge status={ticket.status} />
        </Field>
        <Field label="Priority">
          <TicketPriorityBadge priority={ticket.priority} />
        </Field>
        <Field label="Assignee">
          <span className="inline-flex items-center gap-2">
            <PersonAvatar name={ticket.assignee?.name ?? null} src={ticket.assignee?.avatar} size="sm" />
            <span className={ticket.assignee ? "" : "text-ink-muted"}>{ticket.assignee?.name ?? "Unassigned"}</span>
          </span>
        </Field>
        <Field label="Team">{ticket.team.name}</Field>
        <Field label="Type">{TYPE_LABEL[ticket.type]}</Field>
        <Field label="Category">{CATEGORY_LABEL[ticket.category]}</Field>
        <Field label="Source">
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
      {editing && <TicketEditDrawer ticket={ticket} open={editing} onOpenChange={setEditing} />}
    </DetailCard>
  );
}
