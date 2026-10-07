"use client";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { TimeLabel } from "@/components/shared/time-label";
import { usePresence } from "@/hooks/use-presence";
import { useLookups } from "@/hooks/use-tickets";
import { useNow } from "@/hooks/use-now";
import { CURRENT_AGENT_ID } from "@/lib/mock-data/agents";
import type { Agent, AgentPresence, Ticket, TicketActivity } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

/** Other agents' changes stay "recent" for this long. */
const RECENT_MS = 30 * 60_000;

export interface PresentAgent extends AgentPresence {
  agent: Agent;
}

const firstName = (a: Agent) => a.name.split(" ")[0];

/** "Alex", "Alex and Daniel", "Alex, Daniel and Olivia". */
export function joinNames(agents: Agent[]) {
  const names = agents.map(firstName);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Presence entries resolved to agent profiles, never including the current agent. */
export function resolvePresence(presence: readonly AgentPresence[], agents: Agent[] | undefined): PresentAgent[] {
  if (!agents) return [];
  return presence.flatMap((p) => {
    const agent = agents.find((a) => a.id === p.agentId);
    return agent && agent.id !== CURRENT_AGENT_ID ? [{ ...p, agent }] : [];
  });
}

/** Other agents on the ticket, resolved to their profiles. */
export function useOthers(ticketId: string): PresentAgent[] {
  const presence = usePresence(ticketId);
  const { data: lookups } = useLookups();
  return resolvePresence(presence, lookups?.agents);
}

/** Typing line for a set of agents: "Daniel is replying…", "Emily is writing an internal note…". */
export function typingText(others: PresentAgent[]) {
  const replying = others.filter((o) => o.typing === "reply").map((o) => o.agent);
  const noting = others.filter((o) => o.typing === "note").map((o) => o.agent);
  const parts: string[] = [];
  if (replying.length) parts.push(`${joinNames(replying)} ${replying.length > 1 ? "are" : "is"} replying`);
  if (noting.length) parts.push(`${joinNames(noting)} ${noting.length > 1 ? "are" : "is"} writing an internal note`);
  return parts.length ? `${parts.join(" · ")}…` : null;
}

/** Turns an activity log entry into the way an agent would say it: "updated priority to High". */
function phrase(a: TicketActivity) {
  const after = (re: RegExp) => a.description.match(re)?.[1];
  switch (a.type) {
    case "priority_changed":
      return `updated priority to ${after(/ to (.+)$/) ?? "a new level"}`;
    case "status_changed":
      return `changed status to ${after(/ to (.+)$/) ?? "a new status"}`;
    case "team_changed":
      return `moved this ticket to ${after(/ to (.+)$/) ?? "another team"}`;
    case "assigned":
      return `assigned this ticket to ${after(/^Assigned to (.+)$/) ?? "an agent"}`;
    case "unassigned":
      return "unassigned this ticket";
    case "tag_added":
      return `added the tag "${after(/"(.+)"/) ?? ""}"`;
    case "tag_removed":
      return `removed the tag "${after(/"(.+)"/) ?? ""}"`;
    case "agent_replied":
      return "replied to the customer";
    case "note_added":
      return "added an internal note";
    default:
      return a.description.charAt(0).toLowerCase() + a.description.slice(1);
  }
}

function AvatarStack({ agents }: { agents: Agent[] }) {
  return (
    <span className="flex shrink-0 -space-x-1.5" aria-hidden>
      {agents.slice(0, 3).map((a) => (
        <PersonAvatar key={a.id} name={a.name} src={a.avatar} size="sm" className="rounded-full ring-2 ring-card" />
      ))}
    </span>
  );
}

/**
 * Who else is on this ticket and what they've just changed — shown under the
 * ticket identity. Quiet when nobody else is around.
 */
export function TicketCollaboration({ ticket, className }: { ticket: Ticket; className?: string }) {
  const others = useOthers(ticket.id);
  const now = useNow();
  const { data: lookups } = useLookups();
  const me = lookups?.agents.find((a) => a.id === CURRENT_AGENT_ID)?.name;
  const recent = ticket.activities
    .filter((a) => a.actor !== me && lookups?.agents.some((x) => x.name === a.actor) && now - Date.parse(a.timestamp) < RECENT_MS)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 2);

  if (!others.length && !recent.length) return null;
  const viewers = others.map((o) => o.agent);
  const viewingText =
    viewers.length >= 3 ? `${viewers.length} agents are viewing this ticket` : `${joinNames(viewers)} ${viewers.length > 1 ? "are" : "is"} viewing this ticket`;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]", className)}>
      {viewers.length > 0 && (
        <span className="inline-flex items-center gap-2 text-ink-body" role="status" title={viewers.map((v) => v.name).join(", ")}>
          <AvatarStack agents={viewers} />
          <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          {viewingText}
        </span>
      )}
      {recent.map((a) => {
        const agent = lookups?.agents.find((x) => x.name === a.actor);
        return (
          <span key={a.id} className="inline-flex min-w-0 items-center gap-1.5 text-ink-muted">
            <span aria-hidden>·</span>
            <span className="truncate">
              <span className="font-medium text-ink-body">{agent ? firstName(agent) : a.actor}</span> {phrase(a)}
            </span>
            <TimeLabel iso={a.timestamp} className="shrink-0 whitespace-nowrap" />
          </span>
        );
      })}
    </div>
  );
}

/** "Daniel is replying…" strip shown just above the composer. */
export function TypingIndicator({ ticketId, className }: { ticketId: string; className?: string }) {
  const others = useOthers(ticketId).filter((o) => o.typing);
  const text = typingText(others);
  if (!text) return null;
  const note = others.every((o) => o.typing === "note");
  // One colleague: their full name ("Alex Rivera is replying…"); several: first names.
  const label = others.length === 1 ? text.replace(firstName(others[0].agent), others[0].agent.name) : text;
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-body font-semibold",
        note ? "bg-[#FFFBEB] text-[#92400E]" : "bg-desk-10 text-ink",
        className,
      )}
    >
      <AvatarStack agents={others.map((o) => o.agent)} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-caption font-normal text-ink-muted">Just now</span>
    </div>
  );
}
