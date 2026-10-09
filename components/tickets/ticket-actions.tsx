"use client";

import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  CircleHalfIcon,
  DotsThreeVerticalIcon,
  FlagIcon,
  TagIcon,
  UserCircleIcon,
  UserIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { useUpdateTicket } from "@/hooks/use-ticket";
import { useLookups } from "@/hooks/use-tickets";
import type { TicketPatch } from "@/lib/api/tickets";
import { SUGGESTED_TAGS } from "@/lib/mock-data/tickets";
import { PRIORITY_META, STATUS_META } from "@/lib/ticket-meta";
import { TICKET_PRIORITIES, TICKET_STATUSES, type TicketPriority, type TicketStatus } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { TicketLink } from "./ticket-link";

/** The fields any ticket action needs — satisfied by both list rows and full tickets. */
export interface ActionableTicket {
  id: string;
  ticketNumber: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee: { id: string; name: string } | null;
  team: { id: string; name: string };
  tags: string[];
}

/** Mutations with consistent confirmation toasts. Local/mock state only. */
export function useTicketActions(ticket: ActionableTicket) {
  const update = useUpdateTicket();
  const { data: lookups } = useLookups();
  const ref = `#${ticket.ticketNumber}`;

  const run = (patch: TicketPatch, message: string) =>
    update.mutate({ id: ticket.id, patch }, { onSuccess: () => toast.success(message) });

  return {
    pending: update.isPending,
    /** Any other patch, with its confirmation message. */
    update: run,
    assign: (agentId: string | null) => {
      if (agentId === (ticket.assignee?.id ?? null)) return;
      const agent = lookups?.agents.find((a) => a.id === agentId);
      run({ assigneeId: agentId }, agent ? `${ref} assigned to ${agent.name}` : `${ref} unassigned`);
    },
    setTeam: (teamId: string) => {
      if (teamId === ticket.team.id) return;
      const team = lookups?.teams.find((t) => t.id === teamId);
      run({ teamId }, `${ref} moved to ${team?.name ?? "team"}`);
    },
    setStatus: (status: TicketStatus) => {
      if (status === ticket.status) return;
      run({ status }, `${ref} marked ${STATUS_META[status].label}`);
    },
    setPriority: (priority: TicketPriority) => {
      if (priority === ticket.priority) return;
      run({ priority }, `${ref} priority set to ${PRIORITY_META[priority].label}`);
    },
    toggleTag: (tag: string) => {
      const has = ticket.tags.includes(tag);
      run(has ? { removeTag: tag } : { addTag: tag }, has ? `Tag "${tag}" removed` : `Tag "${tag}" added`);
    },
  };
}

// ── Reusable menu sections ───────────────────────────────────────────

export function AssigneeMenuItems({ ticket, onAssign }: { ticket: ActionableTicket; onAssign: (id: string | null) => void }) {
  const { data: lookups } = useLookups();
  if (!lookups) return <DropdownMenuItem disabled>Loading agents…</DropdownMenuItem>;
  const me = lookups.agents.find((a) => a.id === lookups.currentAgentId)!;
  const current = ticket.assignee?.id ?? "none";
  return (
    <>
      {current !== me.id && (
        <>
          <DropdownMenuItem onSelect={() => onAssign(me.id)}>
            <UserCircleIcon size={16} aria-hidden /> Assign to me
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuRadioGroup value={current} onValueChange={(v) => onAssign(v === "none" ? null : v)}>
        {lookups.teams.map((team) => {
          const agents = lookups.agents.filter((a) => a.teamId === team.id);
          if (!agents.length) return null;
          return (
            <div key={team.id} role="group" aria-label={team.name}>
              <DropdownMenuLabel className="pt-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {team.name}
                {team.id === ticket.team.id && <span className="ml-1 normal-case">· this ticket&apos;s team</span>}
              </DropdownMenuLabel>
              {agents.map((a) => (
                <DropdownMenuRadioItem key={a.id} value={a.id}>
                  <PersonAvatar name={a.name} src={a.avatar} size="xs" status={a.status} />
                  {a.name}
                </DropdownMenuRadioItem>
              ))}
            </div>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuRadioItem value="none">
          <PersonAvatar name={null} size="xs" /> Unassigned
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </>
  );
}

export function StatusMenuItems({ value, onChange }: { value: TicketStatus; onChange: (s: TicketStatus) => void }) {
  return (
    <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as TicketStatus)}>
      {TICKET_STATUSES.map((s) => (
        <DropdownMenuRadioItem key={s} value={s}>
          <span className={cn("size-2 rounded-full", STATUS_META[s].dot)} aria-hidden />
          {STATUS_META[s].label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

export function PriorityMenuItems({ value, onChange }: { value: TicketPriority; onChange: (p: TicketPriority) => void }) {
  return (
    <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as TicketPriority)}>
      {[...TICKET_PRIORITIES].reverse().map((p) => (
        <DropdownMenuRadioItem key={p} value={p} className={PRIORITY_META[p].text}>
          {PRIORITY_META[p].label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

export function TagMenuItems({ tags, onToggle }: { tags: string[]; onToggle: (tag: string) => void }) {
  const options = [...new Set([...tags, ...SUGGESTED_TAGS])];
  return (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground">Toggle tags</DropdownMenuLabel>
      {options.map((tag) => (
        <DropdownMenuCheckboxItem
          key={tag}
          checked={tags.includes(tag)}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={() => onToggle(tag)}
        >
          {tag}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}

// ── Row actions menu (ticket list) ───────────────────────────────────

export function TicketRowActions({ ticket }: { ticket: ActionableTicket }) {
  const actions = useTicketActions(ticket);
  const closed = ticket.status === "closed";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ticket #${ticket.ticketNumber}`}
          className="inline-flex size-8 items-center justify-center rounded-lg text-ink transition-colors hover:bg-desk-tint focus-visible:outline-2 focus-visible:outline-desk-action data-[state=open]:bg-desk-tint"
        >
          <DotsThreeVerticalIcon size={20} weight="bold" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <TicketLink ticketId={ticket.id}>
            <ArrowSquareOutIcon size={16} aria-hidden /> Open
          </TicketLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UserIcon size={16} aria-hidden /> Assign
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[60vh] w-60 overflow-y-auto">
            <AssigneeMenuItems ticket={ticket} onAssign={actions.assign} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <CircleHalfIcon size={16} aria-hidden /> Change status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            <StatusMenuItems value={ticket.status} onChange={actions.setStatus} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FlagIcon size={16} aria-hidden /> Change priority
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40">
            <PriorityMenuItems value={ticket.priority} onChange={actions.setPriority} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <TagIcon size={16} aria-hidden /> Add tag
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-[60vh] w-48 overflow-y-auto">
            <TagMenuItems tags={ticket.tags} onToggle={actions.toggleTag} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        {ticket.status !== "resolved" && !closed && (
          <DropdownMenuItem onSelect={() => actions.setStatus("resolved")}>
            <CheckCircleIcon size={16} aria-hidden /> Resolve
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={closed} onSelect={() => actions.setStatus("closed")}>
          <XCircleIcon size={16} aria-hidden /> Close ticket
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
