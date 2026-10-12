"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BuildingsIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  GlobeIcon,
  NotePencilIcon,
  PencilSimpleIcon,
  PhoneIcon,
  PlusIcon,
  TicketIcon,
  TimerIcon,
  TrashIcon,
  UserPlusIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Breadcrumb, DetailTabs, KpiRow, KpiTile, PageShell, Pill, PrimaryButton, SecondaryButton } from "@/components/shared/desk-ui";
import { Panel, Segmented, useDrawer } from "@/components/shared/module-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { useNewTicket } from "@/components/tickets/new-ticket-dialog";
import { TicketPriorityBadge } from "@/components/tickets/ticket-priority-badge";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomer, useCustomerNotes } from "@/hooks/use-desk-modules";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDuration, pluralize } from "@/lib/format";
import { ACTIVE_STATUSES } from "@/lib/ticket-meta";
import { ticketHref } from "@/lib/ticket-routes";
import type { Contact } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { ContactDrawer, CUSTOMER_STATUS_META, CustomerDrawer } from "./customer-forms";

type Tab = "tickets" | "contacts" | "notes";
type TicketFilter = "open" | "closed" | "all";

/** One customer: account details, ticket history, contacts and internal notes (Zoho Desk account view). */
export function CustomerDetail({ customerId }: { customerId: string }) {
  const { data, isPending, isError, refetch } = useCustomer(customerId);
  const hydrated = useHydrated();
  const [state, setState] = useUrlState({ tab: "tickets", show: "open" });
  const editDrawer = useDrawer();
  const contactDrawer = useDrawer<Contact>();
  const { openNewTicketFor } = useNewTicket();

  if (!hydrated || isPending) {
    return (
      <PageShell>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-[140px] rounded-2xl" />
        <Skeleton className="h-[82px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </PageShell>
    );
  }
  if (isError) return <ErrorState title="Unable to load this customer" action={<SecondaryButton onClick={() => refetch()}>Try again</SecondaryButton>} />;
  if (!data) {
    return (
      <EmptyState
        icon={BuildingsIcon}
        title="Customer not found"
        hint="It may have been removed, or the link is wrong."
        action={
          <Link href="/customers" className="inline-flex h-10 items-center rounded-lg border border-line bg-card px-4 text-button-sm font-semibold text-ink transition-colors hover:border-desk">
            Back to customers
          </Link>
        }
      />
    );
  }

  const { customer, contacts, tickets, notes, stats } = data;
  const tab: Tab = (["tickets", "contacts", "notes"] as const).includes(state.tab as Tab) ? (state.tab as Tab) : "tickets";
  const meta = CUSTOMER_STATUS_META[customer.status];
  const since = new Date(`${customer.customerSince}T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <PageShell>
      <Breadcrumb items={[{ label: "Customers", href: "/customers" }, { label: customer.name }]} />

      <section aria-label="Customer" className="rounded-2xl border border-line-soft bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <PersonAvatar name={customer.name} size="xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-[24px] leading-8 font-bold tracking-tight text-ink sm:text-[28px] sm:leading-9">{customer.name}</h1>
                <Pill tone={meta.tone}>{meta.label}</Pill>
              </div>
              <p className="mt-1 text-[15px] text-ink-muted">
                {customer.type} · {customer.plan} plan
              </p>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-body">
                {customer.domain && (
                  <div className="flex items-center gap-2">
                    <GlobeIcon size={16} aria-hidden className="text-desk" />
                    <dt className="sr-only">Domain</dt>
                    <dd>{customer.domain}</dd>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon size={16} aria-hidden className="text-desk" />
                    <dt className="sr-only">Phone</dt>
                    <dd>
                      <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className="hover:text-desk">
                        {customer.phone}
                      </a>
                    </dd>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CalendarBlankIcon size={16} aria-hidden className="text-desk" />
                  <dt className="sr-only">Customer since</dt>
                  <dd>Customer since {since}</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <SecondaryButton icon={PencilSimpleIcon} onClick={() => editDrawer.show()}>
              Edit
            </SecondaryButton>
            <SecondaryButton icon={UserPlusIcon} onClick={() => contactDrawer.show()}>
              Add contact
            </SecondaryButton>
            <PrimaryButton size="md" icon={PlusIcon} disabled={!contacts.length} title={contacts.length ? undefined : "Add a contact first"} onClick={() => openNewTicketFor({ contactId: contacts[0].id })}>
              New ticket
            </PrimaryButton>
          </div>
        </div>
      </section>

      <KpiRow cols="sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Open tickets" value={stats.open} tone="desk" icon={TicketIcon} onClick={() => setState({ tab: "tickets", show: "open" })} active={tab === "tickets" && state.show === "open"} />
        <KpiTile label="Resolved" value={stats.resolved} tone="blue" icon={CheckCircleIcon} onClick={() => setState({ tab: "tickets", show: "closed" })} active={tab === "tickets" && state.show === "closed"} />
        <KpiTile label="SLA at risk" value={stats.slaRisk} tone={stats.slaRisk ? "orange" : "gray"} icon={WarningCircleIcon} />
        <KpiTile label="Avg first response" value={stats.avgFirstResponseMins === null ? "—" : formatDuration(stats.avgFirstResponseMins * 60_000)} tone="purple" icon={TimerIcon} />
      </KpiRow>

      <Panel bodyClassName="px-4 pb-4 sm:px-5">
        <DetailTabs<Tab>
          label="Customer sections"
          active={tab}
          onChange={(t) => setState({ tab: t })}
          tabs={[
            { key: "tickets", label: "Tickets", count: stats.total },
            { key: "contacts", label: "Contacts", count: contacts.length },
            { key: "notes", label: "Notes", count: notes.length },
          ]}
          actions={
            tab === "tickets" && stats.total > 0 ? (
              <Link href={`/tickets?customer=${customer.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-desk hover:text-desk-press">
                Open in Tickets <ArrowRightIcon size={14} weight="bold" aria-hidden />
              </Link>
            ) : undefined
          }
        />
        <div className="pt-4">
          {tab === "tickets" && <TicketsTab customerId={customer.id} tickets={tickets} show={(state.show as TicketFilter) || "open"} onShow={(show) => setState({ show })} />}
          {tab === "contacts" && (
            <ContactsTab contacts={contacts} onEdit={(c) => contactDrawer.show(c)} onNewTicket={(contactId) => openNewTicketFor({ contactId })} onAdd={() => contactDrawer.show()} />
          )}
          {tab === "notes" && <NotesTab customerId={customer.id} notes={notes} />}
        </div>
      </Panel>

      <CustomerDrawer key={`cu-${editDrawer.key}`} open={editDrawer.open} onOpenChange={editDrawer.setOpen} customer={customer} />
      <ContactDrawer key={`co-${contactDrawer.key}`} open={contactDrawer.open} onOpenChange={contactDrawer.setOpen} contact={contactDrawer.item} customerId={customer.id} />
    </PageShell>
  );
}

function TicketsTab({ customerId, tickets, show, onShow }: { customerId: string; tickets: NonNullable<ReturnType<typeof useCustomer>["data"]>["tickets"]; show: TicketFilter; onShow: (s: TicketFilter) => void }) {
  const open = tickets.filter((t) => ACTIVE_STATUSES.includes(t.status));
  const rows = show === "open" ? open : show === "closed" ? tickets.filter((t) => !ACTIVE_STATUSES.includes(t.status)) : tickets;
  return (
    <div className="space-y-3">
      <Segmented
        label="Which tickets"
        value={show}
        onChange={onShow}
        options={[
          { value: "open", label: "Open", count: open.length },
          { value: "closed", label: "Resolved", count: tickets.length - open.length },
          { value: "all", label: "All", count: tickets.length },
        ]}
      />
      {rows.length ? (
        <ul className="divide-y divide-line-soft rounded-xl border border-line-soft">
          {rows.map((t) => (
            <li key={t.id}>
              <Link href={ticketHref(t.id, { customer: [customerId] })} className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-desk-surface sm:flex-row sm:items-center sm:gap-4">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{t.subject}</span>
                  <span className="block truncate text-[13px] text-ink-muted">
                    #{t.ticketNumber} · {t.contact.name} · {t.team.name}
                  </span>
                </span>
                <span className="flex shrink-0 flex-wrap items-center gap-3">
                  <TicketStatusBadge status={t.status} />
                  <TicketPriorityBadge priority={t.priority} />
                  <span className="flex items-center gap-1.5 text-[13px] text-ink-body" title={t.assignee?.name ?? "Unassigned"}>
                    <PersonAvatar name={t.assignee?.name ?? null} src={t.assignee?.avatar} size="sm" />
                    <span className="hidden lg:inline">{t.assignee?.name ?? "Unassigned"}</span>
                  </span>
                  <TimeLabel iso={t.updatedAt} className="w-16 text-right text-[13px] text-ink-muted" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={TicketIcon} title={show === "open" ? "No open tickets" : "No tickets here"} hint={show === "open" ? "Everything for this customer is resolved." : undefined} className="py-10" />
      )}
    </div>
  );
}

function ContactsTab({
  contacts,
  onEdit,
  onNewTicket,
  onAdd,
}: {
  contacts: (Contact & { openTickets: number; totalTickets: number })[];
  onEdit: (c: Contact) => void;
  onNewTicket: (contactId: string) => void;
  onAdd: () => void;
}) {
  if (!contacts.length) {
    return <EmptyState icon={UserPlusIcon} title="No contacts yet" hint="Add the people who raise tickets for this customer." action={<SecondaryButton onClick={onAdd}>Add contact</SecondaryButton>} className="py-10" />;
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {contacts.map((c) => (
        <li key={c.id} className="flex flex-col rounded-xl border border-line-soft p-4">
          <div className="flex items-start gap-3">
            <PersonAvatar name={c.name} src={c.avatar} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-ink">{c.name}</p>
              <p className="truncate text-[13px] text-ink-muted">{c.title || "—"}</p>
            </div>
            <button type="button" onClick={() => onEdit(c)} aria-label={`Edit ${c.name}`} className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-desk-tint hover:text-desk">
              <PencilSimpleIcon size={16} aria-hidden />
            </button>
          </div>
          <dl className="mt-3 space-y-1.5 text-[13px] text-ink-body">
            <div className="flex items-center gap-2">
              <EnvelopeSimpleIcon size={15} aria-hidden className="shrink-0 text-desk" />
              <dt className="sr-only">Email</dt>
              <dd className="min-w-0 truncate">
                <a href={`mailto:${c.email}`} className="hover:text-desk">
                  {c.email}
                </a>
              </dd>
            </div>
            {c.phone && (
              <div className="flex items-center gap-2">
                <PhoneIcon size={15} aria-hidden className="shrink-0 text-desk" />
                <dt className="sr-only">Phone</dt>
                <dd>{c.phone}</dd>
              </div>
            )}
          </dl>
          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <span className="text-[13px] text-ink-muted">
              <span className="font-semibold text-ink">{c.openTickets}</span> open · {pluralize(c.totalTickets, "ticket")}
            </span>
            <button type="button" onClick={() => onNewTicket(c.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-desk px-3 text-button-sm font-semibold text-desk hover:bg-desk-tint">
              <PlusIcon size={14} weight="bold" aria-hidden /> Ticket
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function NotesTab({ customerId, notes }: { customerId: string; notes: NonNullable<ReturnType<typeof useCustomer>["data"]>["notes"] }) {
  const { add, remove } = useCustomerNotes(customerId);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string>();
  const submit = () => {
    if (body.trim().length < 3) return setError("Write at least 3 characters.");
    add.mutate(body, { onSuccess: () => setBody("") });
  };
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line-soft bg-desk-surface p-3">
        <label htmlFor="customer-note" className="sr-only">
          New note
        </label>
        <textarea
          id="customer-note"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setError(undefined);
          }}
          rows={3}
          placeholder="Add an internal note about this customer — only agents can see it"
          aria-invalid={!!error}
          className="w-full resize-y rounded-lg border-[1.5px] border-line bg-white px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:border-desk focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className={cn("text-[12px]", error ? "font-medium text-destructive" : "text-ink-muted")} role={error ? "alert" : undefined}>
            {error ?? "Visible to your team only"}
          </p>
          <button type="button" onClick={submit} disabled={add.isPending} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-desk px-4 text-button-sm font-semibold text-white hover:bg-desk-press disabled:opacity-60">
            <NotePencilIcon size={16} aria-hidden /> {add.isPending ? "Adding…" : "Add note"}
          </button>
        </div>
      </div>
      {notes.length ? (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="flex gap-3 rounded-xl border border-line-soft p-4">
              <PersonAvatar name={n.author.name} src={n.author.avatar} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink-muted">
                  <span className="font-semibold text-ink">{n.author.name}</span> · <TimeLabel iso={n.createdAt} />
                </p>
                <p className="mt-1 text-[14px] leading-6 whitespace-pre-wrap text-ink-body">{n.body}</p>
              </div>
              <button
                type="button"
                onClick={() => remove.mutate(n.id)}
                aria-label="Delete note"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-[#EF4444]"
              >
                <TrashIcon size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-ink-muted">No notes yet.</p>
      )}
    </div>
  );
}
