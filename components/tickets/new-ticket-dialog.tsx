"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TicketIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DrawerActions, DrawerSection, FormField, SideDrawer, fieldClass } from "@/components/shared/desk-ui";
import { useCreateTicket } from "@/hooks/use-ticket";
import { useLookups } from "@/hooks/use-tickets";
import { createTicketSchema, type CreateTicketInput } from "@/lib/schemas/ticket";
import { CATEGORY_LABEL, PRIORITY_META, SOURCE_LABEL, TYPE_LABEL } from "@/lib/ticket-meta";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_SOURCES, TICKET_TYPES } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

const NewTicketContext = createContext<{ openNewTicket: () => void }>({ openNewTicket: () => {} });
export const useNewTicket = () => useContext(NewTicketContext);

/** Provides `openNewTicket()` to the header and the Tickets page, and hosts the create drawer. */
export function NewTicketProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Remount the form on every open so it starts clean.
  const [session, setSession] = useState(0);
  const openNewTicket = useCallback(() => {
    setSession((s) => s + 1);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ openNewTicket }), [openNewTicket]);
  return (
    <NewTicketContext.Provider value={value}>
      {children}
      <NewTicketDrawer key={session} open={open} onOpenChange={setOpen} />
    </NewTicketContext.Provider>
  );
}

const INITIAL: CreateTicketInput = {
  contactId: "",
  subject: "",
  description: "",
  priority: "medium",
  type: "question",
  category: "general",
  source: "phone",
  teamId: "team-tech",
  assigneeId: null,
};

type Errors = Partial<Record<keyof CreateTicketInput, string>>;

/** Create-ticket side drawer — the ServiceOps "New job" drawer pattern, validated with Zod. */
function NewTicketDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { data: lookups } = useLookups();
  const create = useCreateTicket();
  const [values, setValues] = useState<CreateTicketInput>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof CreateTicketInput>(key: K, value: CreateTicketInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const teamAgents = lookups?.agents.filter((a) => a.teamId === values.teamId) ?? [];

  const submit = () => {
    const parsed = createTicketSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CreateTicketInput;
        next[key] ??= issue.message;
      }
      setErrors(next);
      document.getElementById(`nt-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: (ticket) => {
        toast.success(`Ticket #${ticket.ticketNumber} created`, { description: ticket.subject });
        onOpenChange(false);
        router.push(`/tickets/${ticket.id}`);
      },
    });
  };

  const enumSelect = (id: string, value: string, onChange: (v: string) => void, options: [string, string][]) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={fieldClass}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      icon={TicketIcon}
      title="New ticket"
      subtitle="Log a request on behalf of a customer"
      footer={<DrawerActions onCancel={() => onOpenChange(false)} onSubmit={submit} submitLabel={create.isPending ? "Creating…" : "Create ticket"} disabled={create.isPending} />}
    >
      <DrawerSection title="Requester">
        <FormField label="Customer contact" htmlFor="nt-contactId" error={errors.contactId}>
          <Select value={values.contactId} onValueChange={(v) => set("contactId", v)}>
            <SelectTrigger id="nt-contactId" className={fieldClass} aria-invalid={!!errors.contactId}>
              <SelectValue placeholder="Choose a customer contact" />
            </SelectTrigger>
            <SelectContent>
              {lookups?.customers.map((cus) => (
                <SelectGroup key={cus.id}>
                  <SelectLabel>{cus.name}</SelectLabel>
                  {lookups.contacts
                    .filter((c) => c.customerId === cus.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} <span className="text-ink-muted">· {c.email}</span>
                      </SelectItem>
                    ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </DrawerSection>

      <DrawerSection title="Request">
        <div className="grid gap-4">
          <FormField label="Subject" htmlFor="nt-subject" error={errors.subject}>
            <input
              id="nt-subject"
              value={values.subject}
              onChange={(e) => set("subject", e.target.value)}
              placeholder="Short summary of the request"
              aria-invalid={!!errors.subject}
              className={fieldClass}
            />
          </FormField>
          <FormField label="Description" htmlFor="nt-description" error={errors.description}>
            <textarea
              id="nt-description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What is the customer asking for? Include steps, error messages and impact."
              rows={5}
              aria-invalid={!!errors.description}
              className={cn(fieldClass, "h-auto resize-y py-2.5 leading-relaxed")}
            />
          </FormField>
        </div>
      </DrawerSection>

      <DrawerSection title="Classification">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Priority" htmlFor="nt-priority">
            {enumSelect("nt-priority", values.priority, (v) => set("priority", v as CreateTicketInput["priority"]), [...TICKET_PRIORITIES].reverse().map((p) => [p, PRIORITY_META[p].label]))}
          </FormField>
          <FormField label="Type" htmlFor="nt-type">
            {enumSelect("nt-type", values.type, (v) => set("type", v as CreateTicketInput["type"]), TICKET_TYPES.map((t) => [t, TYPE_LABEL[t]]))}
          </FormField>
          <FormField label="Category" htmlFor="nt-category">
            {enumSelect("nt-category", values.category, (v) => set("category", v as CreateTicketInput["category"]), TICKET_CATEGORIES.map((c) => [c, CATEGORY_LABEL[c]]))}
          </FormField>
          <FormField label="Source" htmlFor="nt-source">
            {enumSelect("nt-source", values.source, (v) => set("source", v as CreateTicketInput["source"]), TICKET_SOURCES.map((s) => [s, SOURCE_LABEL[s]]))}
          </FormField>
        </div>
      </DrawerSection>

      <DrawerSection title="Assignment">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Team" htmlFor="nt-teamId" error={errors.teamId}>
            {enumSelect(
              "nt-teamId",
              values.teamId,
              (v) => {
                set("teamId", v);
                const stillMember = lookups?.agents.some((a) => a.id === values.assigneeId && a.teamId === v);
                if (!stillMember) set("assigneeId", null);
              },
              (lookups?.teams ?? []).map((t) => [t.id, t.name]),
            )}
          </FormField>
          <FormField label="Assignee" htmlFor="nt-assigneeId">
            {enumSelect("nt-assigneeId", values.assigneeId ?? "none", (v) => set("assigneeId", v === "none" ? null : v), [
              ["none", "Unassigned"],
              ...teamAgents.map((a) => [a.id, a.name] as [string, string]),
            ])}
          </FormField>
        </div>
      </DrawerSection>
    </SideDrawer>
  );
}
