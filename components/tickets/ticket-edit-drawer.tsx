"use client";

import { useState } from "react";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DrawerActions, DrawerSection, FormField, SideDrawer, fieldClass } from "@/components/shared/desk-ui";
import { useUpdateTicket } from "@/hooks/use-ticket";
import { useLookups } from "@/hooks/use-tickets";
import { CATEGORY_LABEL, PRIORITY_META, STATUS_META, TYPE_LABEL } from "@/lib/ticket-meta";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TYPES,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
} from "@/lib/types/ticket";

interface Draft {
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  category: TicketCategory;
  teamId: string;
  assigneeId: string | null;
}

/** "Edit ticket" side drawer — the ServiceOps Edit Job drawer pattern. */
export function TicketEditDrawer({ ticket, open, onOpenChange }: { ticket: Ticket; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: lookups } = useLookups();
  const update = useUpdateTicket();
  const initial: Draft = {
    status: ticket.status,
    priority: ticket.priority,
    type: ticket.type,
    category: ticket.category,
    teamId: ticket.team.id,
    assigneeId: ticket.assignee?.id ?? null,
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    const patch = Object.fromEntries(Object.entries(draft).filter(([k, v]) => initial[k as keyof Draft] !== v));
    if (!Object.keys(patch).length) {
      onOpenChange(false);
      return;
    }
    update.mutate(
      { id: ticket.id, patch },
      {
        onSuccess: () => {
          toast.success(`#${ticket.ticketNumber} updated`);
          onOpenChange(false);
        },
      },
    );
  };

  const select = (id: string, value: string, onChange: (v: string) => void, items: React.ReactNode) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={fieldClass}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{items}</SelectContent>
    </Select>
  );

  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      icon={PencilSimpleIcon}
      title="Edit ticket"
      subtitle={`#${ticket.ticketNumber} · ${ticket.subject}`}
      footer={<DrawerActions onCancel={() => onOpenChange(false)} onSubmit={save} submitLabel={update.isPending ? "Saving…" : "Save changes"} disabled={update.isPending} />}
    >
      <DrawerSection title="Status & priority">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Status" htmlFor="ed-status">
            {select("ed-status", draft.status, (v) => set("status", v as TicketStatus), TICKET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
            )))}
          </FormField>
          <FormField label="Priority" htmlFor="ed-priority">
            {select("ed-priority", draft.priority, (v) => set("priority", v as TicketPriority), [...TICKET_PRIORITIES].reverse().map((p) => (
              <SelectItem key={p} value={p}>{PRIORITY_META[p].label}</SelectItem>
            )))}
          </FormField>
        </div>
      </DrawerSection>
      <DrawerSection title="Assignment">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Team" htmlFor="ed-team">
            {select(
              "ed-team",
              draft.teamId,
              (v) => {
                set("teamId", v);
                if (draft.assigneeId && lookups?.agents.find((a) => a.id === draft.assigneeId)?.teamId !== v) set("assigneeId", null);
              },
              (lookups?.teams ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>),
            )}
          </FormField>
          <FormField label="Assignee" htmlFor="ed-assignee">
            {select(
              "ed-assignee",
              draft.assigneeId ?? "none",
              (v) => set("assigneeId", v === "none" ? null : v),
              <>
                <SelectGroup>
                  <SelectLabel>{lookups?.teams.find((t) => t.id === draft.teamId)?.name}</SelectLabel>
                  {(lookups?.agents ?? [])
                    .filter((a) => a.teamId === draft.teamId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                        {a.id === lookups?.currentAgentId ? " (me)" : ""}
                      </SelectItem>
                    ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectItem value="none">Unassigned</SelectItem>
              </>,
            )}
          </FormField>
        </div>
      </DrawerSection>
      <DrawerSection title="Classification">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type" htmlFor="ed-type">
            {select("ed-type", draft.type, (v) => set("type", v as TicketType), TICKET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
            )))}
          </FormField>
          <FormField label="Category" htmlFor="ed-category">
            {select("ed-category", draft.category, (v) => set("category", v as TicketCategory), TICKET_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
            )))}
          </FormField>
        </div>
      </DrawerSection>
    </SideDrawer>
  );
}
