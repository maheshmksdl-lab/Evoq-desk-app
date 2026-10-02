"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowBendUpLeftIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
import { NextStep, StripButton, type PillTone } from "@/components/shared/desk-ui";
import { useNow } from "@/hooks/use-now";
import { formatDuration, formatRelative } from "@/lib/format";
import { CURRENT_AGENT_ID } from "@/lib/mock-data/agents";
import type { Ticket } from "@/lib/types/ticket";
import { useTicketActions } from "./ticket-actions";

/** One line answering "what should I do next?" — the ServiceOps NEXT STEP strip. */
export function TicketNextAction({ ticket, onReply }: { ticket: Ticket; onReply: () => void }) {
  const actions = useTicketActions(ticket);
  const now = useNow();
  const lastPublic = [...ticket.messages].reverse().find((m) => m.visibility === "public");
  const first = ticket.contact.name.split(" ")[0];

  let tone: PillTone = "teal";
  let label: ReactNode;
  const buttons: ReactNode[] = [];
  const reply = (
    <StripButton key="reply" onClick={onReply}>
      <ArrowBendUpLeftIcon size={13} weight="bold" aria-hidden /> Reply
    </StripButton>
  );

  if (ticket.mergedInto) {
    tone = "gray";
    label = (
      <>
        Merged into{" "}
        <Link href={`/tickets/${ticket.mergedInto.id}`} className="font-semibold text-desk underline underline-offset-2">
          #{ticket.mergedInto.ticketNumber}
        </Link>{" "}
        — continue the conversation there
      </>
    );
  } else if (ticket.status === "closed") {
    tone = "gray";
    label = "Ticket closed — reopen it if the customer needs more help";
    buttons.push(
      <StripButton key="reopen" onClick={() => actions.setStatus("open")}>
        <ArrowCounterClockwiseIcon size={13} aria-hidden /> Reopen
      </StripButton>,
    );
  } else if (ticket.status === "resolved") {
    tone = "blue";
    label = "Resolved — waiting for the customer to confirm, then close the ticket";
    buttons.push(
      <StripButton key="close" onClick={() => actions.setStatus("closed")}>
        Close ticket
      </StripButton>,
    );
  } else if (!ticket.sla.firstRespondedAt) {
    const breached = ticket.sla.firstResponseStatus === "breached";
    const diff = Date.parse(ticket.sla.firstResponseDue) - now;
    tone = breached ? "red" : ticket.sla.firstResponseStatus === "at_risk" ? "amber" : "teal";
    label = `Send ${first} a first response — ${breached ? `overdue by ${formatDuration(diff)}` : `due in ${formatDuration(diff)}`}`;
    buttons.push(reply);
  } else if (ticket.status === "pending") {
    tone = "amber";
    label = `Waiting on ${ticket.contact.name} since ${lastPublic ? formatRelative(lastPublic.timestamp, now) : "recently"} — follow up if you don't hear back`;
  } else if (ticket.status === "on_hold") {
    tone = "orange";
    label = "On hold — check the latest internal note for what this ticket is waiting on";
  } else if (lastPublic?.authorType === "customer") {
    tone = ticket.sla.resolutionStatus === "breached" ? "red" : ticket.sla.resolutionStatus === "at_risk" ? "amber" : "teal";
    label = `${lastPublic.author.name} replied ${formatRelative(lastPublic.timestamp, now)} — the customer is waiting on you`;
    buttons.push(reply);
  } else {
    label = "Waiting on the support team — reply, or set to Pending if you need more from the customer";
    buttons.push(reply);
  }

  const unassigned = !ticket.assignee && ticket.status !== "closed" && !ticket.mergedInto;
  if (unassigned) {
    buttons.unshift(
      <StripButton key="assign" onClick={() => actions.assign(CURRENT_AGENT_ID)}>
        Assign to me
      </StripButton>,
    );
  }

  return (
    <NextStep
      tone={tone}
      label={
        <>
          {label}
          {unassigned && <span className="text-ink-muted"> · No owner yet</span>}
        </>
      }
      action={buttons.length ? <>{buttons}</> : undefined}
    />
  );
}
