"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BuildingsIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  EnvelopeSimpleIcon,
  FunnelSimpleIcon,
  HeartbeatIcon,
  PencilSimpleIcon,
  PlusIcon,
  TicketIcon,
  UserPlusIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { FilterBar, FilterSelect, KpiRow, KpiTile, ListCard, PageShell, Pill, PrimaryButton, SearchBox, SecondaryButton } from "@/components/shared/desk-ui";
import { bodyCell, downloadCsv, headCell, ModuleHeader, Segmented, SortableHead, useDrawer } from "@/components/shared/module-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { TicketPagination } from "@/components/tickets/ticket-pagination";
import { useNewTicket } from "@/components/tickets/new-ticket-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts, useCustomers } from "@/hooks/use-desk-modules";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUrlState } from "@/hooks/use-url-state";
import { CUSTOMER_SORTS, type ContactRow, type CustomerSort } from "@/lib/api/customers";
import { pluralize } from "@/lib/format";
import { CUSTOMER_PLANS } from "@/lib/schemas/desk";
import { PAGE_SIZES } from "@/lib/schemas/ticket";
import { CUSTOMER_STATUSES, CUSTOMER_TYPES, type Contact, type CustomerStatus, type CustomerType } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { ContactDrawer, CUSTOMER_STATUS_META, CustomerDrawer } from "./customer-forms";

const SORT_LABEL: Record<CustomerSort, string> = {
  name_asc: "Name A–Z",
  open_desc: "Most open tickets",
  recent_desc: "Recent activity",
  since_desc: "Newest customers",
};

const DEFAULTS = { tab: "customers", q: "", type: "", status: "", plan: "", sort: "name_asc", page: 1, size: 10 };

/** Customers: accounts with their ticket load, and every contact who can raise tickets. */
export function CustomersView() {
  const [state, setState] = useUrlState(DEFAULTS);
  const customerDrawer = useDrawer();
  const contactDrawer = useDrawer<Contact>();
  const tab = state.tab === "contacts" ? "contacts" : "customers";

  return (
    <PageShell>
      <ModuleHeader
        title="Customers"
        subtitle="Accounts, the people who contact support, and their tickets"
        actions={
          <>
            <SecondaryButton icon={UserPlusIcon} onClick={() => contactDrawer.show()}>
              New contact
            </SecondaryButton>
            <PrimaryButton size="md" icon={PlusIcon} onClick={() => customerDrawer.show()}>
              New customer
            </PrimaryButton>
          </>
        }
      />

      {tab === "customers" ? <CustomerTable state={state} setState={setState} /> : <ContactTable state={state} setState={setState} onEdit={(c) => contactDrawer.show(c)} />}

      <CustomerDrawer key={`cu-${customerDrawer.key}`} open={customerDrawer.open} onOpenChange={customerDrawer.setOpen} />
      <ContactDrawer key={`co-${contactDrawer.key}`} open={contactDrawer.open} onOpenChange={contactDrawer.setOpen} contact={contactDrawer.item} />
    </PageShell>
  );
}

type State = typeof DEFAULTS;
type SetState = (patch: Partial<State>) => void;

function Tabs({ state, setState, customers, contacts }: { state: State; setState: SetState; customers?: number; contacts?: number }) {
  return (
    <Segmented
      label="Customers or contacts"
      value={state.tab === "contacts" ? "contacts" : "customers"}
      onChange={(tab) => setState({ tab, q: "", type: "", status: "", plan: "", sort: "name_asc" })}
      options={[
        { value: "customers", label: "Customers", count: customers },
        { value: "contacts", label: "Contacts", count: contacts },
      ]}
    />
  );
}

function CustomerTable({ state, setState }: { state: State; setState: SetState }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const sort = (CUSTOMER_SORTS as readonly string[]).includes(state.sort) ? (state.sort as CustomerSort) : "name_asc";
  const size = (PAGE_SIZES as readonly number[]).includes(state.size) ? state.size : 10;
  const query = { q: state.q, type: state.type as CustomerType | "", status: state.status as CustomerStatus | "", plan: state.plan, sort, page: state.page, size };
  const { data, isPending, isError, isPlaceholderData, refetch } = useCustomers(query);
  const filtered = !!(state.q || state.type || state.status || state.plan);

  const exportCsv = () =>
    data &&
    downloadCsv(
      "customers.csv",
      ["Customer", "Domain", "Type", "Plan", "Health", "Contacts", "Open tickets", "Total tickets", "Customer since"],
      data.items.map((r) => [r.customer.name, r.customer.domain, r.customer.type, r.customer.plan, CUSTOMER_STATUS_META[r.customer.status].label, r.contacts.length, r.openTickets, r.totalTickets, r.customer.customerSince]),
    );

  if (!hydrated || isPending) return <ListSkeleton />;
  if (isError) return <ErrorState title="Unable to load customers" action={<SecondaryButton onClick={() => refetch()}>Try again</SecondaryButton>} />;
  const { stats } = data;

  return (
    <>
      <KpiRow cols="sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="All customers" value={stats.total} tone="desk" icon={BuildingsIcon} active={!state.status} onClick={() => setState({ status: "" })} />
        <KpiTile label="Active" value={stats.active} tone="green" icon={HeartbeatIcon} active={state.status === "active"} onClick={() => setState({ status: "active" })} />
        <KpiTile label="At risk" value={stats.atRisk} tone="amber" icon={WarningCircleIcon} active={state.status === "at_risk"} onClick={() => setState({ status: "at_risk" })} />
        <KpiTile label="Open tickets" value={stats.openTickets} tone="blue" icon={TicketIcon} active={sort === "open_desc"} onClick={() => setState({ sort: "open_desc" })} meta="Sort by open tickets" />
      </KpiRow>

      <ListCard className="p-0 sm:p-0">
        <div className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs state={state} setState={setState} customers={stats.total} />
            <SecondaryButton icon={DownloadSimpleIcon} onClick={exportCsv} disabled={!data.items.length} className="h-9">
              Export
            </SecondaryButton>
          </div>
          <FilterBar
            activeCount={[state.type, state.status, state.plan].filter(Boolean).length}
            search={<SearchBox value={state.q} onChange={(q) => setState({ q })} placeholder="Search name, domain, contact or email" className="sm:w-80" />}
          >
            <FilterSelect label="Type" value={state.type} placeholder="All types" options={CUSTOMER_TYPES.map((t) => ({ value: t, label: t }))} onChange={(type) => setState({ type })} className="sm:w-40" />
            <FilterSelect label="Plan" value={state.plan} placeholder="All plans" options={CUSTOMER_PLANS.map((p) => ({ value: p, label: p }))} onChange={(plan) => setState({ plan })} className="sm:w-40" />
            <FilterSelect
              label="Health"
              value={state.status}
              placeholder="Any health"
              options={CUSTOMER_STATUSES.map((s) => ({ value: s, label: CUSTOMER_STATUS_META[s].label }))}
              onChange={(status) => setState({ status })}
              className="sm:w-40"
            />
            <FilterSelect
              label="Sort"
              value={sort === "name_asc" ? "" : sort}
              placeholder={SORT_LABEL.name_asc}
              options={CUSTOMER_SORTS.filter((s) => s !== "name_asc").map((s) => ({ value: s, label: SORT_LABEL[s] }))}
              onChange={(v) => setState({ sort: v || "name_asc" })}
              className="sm:w-48"
            />
          </FilterBar>
        </div>

        {data.total === 0 ? (
          <EmptyState
            icon={filtered ? FunnelSimpleIcon : BuildingsIcon}
            title={filtered ? "No customers match" : "No customers yet"}
            hint={filtered ? "Try another search or clear the filters." : "Add your first customer to start tracking their tickets."}
            action={filtered ? <SecondaryButton onClick={() => setState({ q: "", type: "", status: "", plan: "" })}>Clear filters</SecondaryButton> : undefined}
          />
        ) : (
          <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
            {/* Phones: cards */}
            <ul className="divide-y divide-line-soft border-t border-line md:hidden">
              {data.items.map((r) => (
                <li key={r.customer.id}>
                  <Link href={`/customers/${r.customer.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-desk-surface">
                    <PersonAvatar name={r.customer.name} size="lg" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold text-ink">{r.customer.name}</span>
                        <Pill tone={CUSTOMER_STATUS_META[r.customer.status].tone} className="px-2 py-0.5 text-[11px]">
                          {CUSTOMER_STATUS_META[r.customer.status].label}
                        </Pill>
                      </span>
                      <span className="block truncate text-[13px] text-ink-muted">
                        {r.customer.type} · {r.customer.plan} · {pluralize(r.contacts.length, "contact")}
                      </span>
                      <span className="mt-1 block text-[13px] text-ink-body">
                        <span className="font-semibold text-ink">{r.openTickets}</span> open · {r.totalTickets} total
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {/* Tablet / desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-separate border-spacing-0">
                <caption className="sr-only">Customers</caption>
                <thead>
                  <tr>
                    <SortableHead label="Customer" desc="name_asc" sort={sort} onSort={(s) => setState({ sort: s })} />
                    <th scope="col" className={headCell}>Type · Plan</th>
                    <th scope="col" className={headCell}>Health</th>
                    <th scope="col" className={cn(headCell, "hidden lg:table-cell")}>Contacts</th>
                    <SortableHead label="Open tickets" desc="open_desc" sort={sort} onSort={(s) => setState({ sort: s })} />
                    <SortableHead label="Last activity" desc="recent_desc" sort={sort} onSort={(s) => setState({ sort: s })} className="hidden xl:table-cell" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r.customer.id} onClick={() => router.push(`/customers/${r.customer.id}`)} className="cursor-pointer transition-colors hover:bg-desk-surface">
                      <td className={bodyCell}>
                        <span className="flex items-center gap-3">
                          <PersonAvatar name={r.customer.name} size="lg" />
                          <span className="min-w-0">
                            <Link href={`/customers/${r.customer.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-semibold text-ink hover:text-desk">
                              {r.customer.name}
                            </Link>
                            <span className="block truncate text-[13px] text-ink-muted">{r.customer.domain || r.customer.phone}</span>
                          </span>
                        </span>
                      </td>
                      <td className={bodyCell}>
                        {r.customer.type}
                        <span className="block text-[13px] text-ink-muted">{r.customer.plan}</span>
                      </td>
                      <td className={bodyCell}>
                        <Pill tone={CUSTOMER_STATUS_META[r.customer.status].tone}>{CUSTOMER_STATUS_META[r.customer.status].label}</Pill>
                      </td>
                      <td className={cn(bodyCell, "hidden lg:table-cell")}>
                        <span className="flex items-center -space-x-1.5" title={r.contacts.map((c) => c.name).join(", ")}>
                          {r.contacts.slice(0, 3).map((c) => (
                            <PersonAvatar key={c.id} name={c.name} src={c.avatar} size="sm" className="rounded-full ring-2 ring-white" />
                          ))}
                          <span className="pl-3 text-[13px] text-ink-muted">{r.contacts.length}</span>
                        </span>
                      </td>
                      <td className={bodyCell}>
                        <span className="font-semibold text-ink tabular-nums">{r.openTickets}</span>
                        <span className="text-ink-muted"> / {r.totalTickets}</span>
                        {r.slaRisk > 0 && <span className="block text-[12px] font-medium text-[#EA580C]">{r.slaRisk} SLA at risk</span>}
                      </td>
                      <td className={cn(bodyCell, "hidden xl:table-cell")}>
                        {r.lastActivity ? <TimeLabel iso={r.lastActivity} className="text-ink-muted" /> : <span className="text-ink-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TicketPagination
              noun="customers"
              page={data.page}
              pageCount={data.pageCount}
              pageSize={data.pageSize}
              total={data.total}
              onPage={(page) => setState({ page })}
              onPageSize={(s) => setState({ size: s })}
            />
          </div>
        )}
      </ListCard>
    </>
  );
}

function ContactTable({ state, setState, onEdit }: { state: State; setState: SetState; onEdit: (c: Contact) => void }) {
  const hydrated = useHydrated();
  const size = (PAGE_SIZES as readonly number[]).includes(state.size) ? state.size : 10;
  const { data, isPending, isError, isPlaceholderData, refetch } = useContacts(state.q, state.page, size);
  const { openNewTicketFor } = useNewTicket();

  if (!hydrated || isPending) return <ListSkeleton />;
  if (isError) return <ErrorState title="Unable to load contacts" action={<SecondaryButton onClick={() => refetch()}>Try again</SecondaryButton>} />;

  const actions = (r: ContactRow) => (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Actions for ${r.contact.name}`} className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-desk-tint hover:text-desk data-[state=open]:bg-desk-tint">
        <DotsThreeIcon size={20} weight="bold" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <DropdownMenuItem onSelect={() => openNewTicketFor({ contactId: r.contact.id })}>
          <TicketIcon size={16} aria-hidden /> New ticket
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`mailto:${r.contact.email}`}>
            <EnvelopeSimpleIcon size={16} aria-hidden /> Email
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit(r.contact)}>
          <PencilSimpleIcon size={16} aria-hidden /> Edit contact
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <ListCard className="p-0 sm:p-0">
      <div className="space-y-3 p-3 sm:p-4">
        <Tabs state={state} setState={setState} contacts={state.q ? undefined : data.total} />
        <SearchBox value={state.q} onChange={(q) => setState({ q })} placeholder="Search name, email, title or customer" className="sm:w-96" />
      </div>
      {data.total === 0 ? (
        <EmptyState icon={UsersThreeIcon} title="No contacts match" hint="Try another name, email or customer." action={<SecondaryButton onClick={() => setState({ q: "" })}>Clear search</SecondaryButton>} />
      ) : (
        <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
          <ul className="divide-y divide-line-soft border-t border-line md:hidden">
            {data.items.map((r) => (
              <li key={r.contact.id} className="flex items-start gap-3 px-4 py-3.5">
                <PersonAvatar name={r.contact.name} src={r.contact.avatar} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink">{r.contact.name}</span>
                  <span className="block truncate text-[13px] text-ink-muted">
                    {r.contact.title} ·{" "}
                    <Link href={`/customers/${r.customer.id}`} className="text-desk hover:underline">
                      {r.customer.name}
                    </Link>
                  </span>
                  <span className="block truncate text-[13px] text-ink-body">{r.contact.email}</span>
                </span>
                {actions(r)}
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-separate border-spacing-0">
              <caption className="sr-only">Contacts</caption>
              <thead>
                <tr>
                  <th scope="col" className={headCell}>Contact</th>
                  <th scope="col" className={headCell}>Customer</th>
                  <th scope="col" className={cn(headCell, "hidden lg:table-cell")}>Phone</th>
                  <th scope="col" className={headCell}>Open tickets</th>
                  <th scope="col" className={cn(headCell, "hidden xl:table-cell")}>Last activity</th>
                  <th scope="col" className={headCell}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.contact.id} className="transition-colors hover:bg-desk-surface">
                    <td className={bodyCell}>
                      <span className="flex items-center gap-3">
                        <PersonAvatar name={r.contact.name} src={r.contact.avatar} size="lg" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">{r.contact.name}</span>
                          <a href={`mailto:${r.contact.email}`} className="block truncate text-[13px] text-ink-muted hover:text-desk">
                            {r.contact.email}
                          </a>
                        </span>
                      </span>
                    </td>
                    <td className={bodyCell}>
                      <Link href={`/customers/${r.customer.id}`} className="font-medium text-ink hover:text-desk">
                        {r.customer.name}
                      </Link>
                      <span className="block text-[13px] text-ink-muted">{r.contact.title}</span>
                    </td>
                    <td className={cn(bodyCell, "hidden whitespace-nowrap lg:table-cell")}>{r.contact.phone || "—"}</td>
                    <td className={bodyCell}>
                      {r.totalTickets ? (
                        <Link href={`/tickets?customer=${r.customer.id}&q=${encodeURIComponent(r.contact.email)}`} className="hover:text-desk">
                          <span className="font-semibold text-ink tabular-nums">{r.openTickets}</span>
                          <span className="text-ink-muted"> / {r.totalTickets}</span>
                        </Link>
                      ) : (
                        <span className="text-ink-muted">0</span>
                      )}
                    </td>
                    <td className={cn(bodyCell, "hidden xl:table-cell")}>{r.lastActivity ? <TimeLabel iso={r.lastActivity} className="text-ink-muted" /> : <span className="text-ink-muted">—</span>}</td>
                    <td className={cn(bodyCell, "w-12 text-right")}>{actions(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TicketPagination
            noun="contacts"
            page={data.page}
            pageCount={data.pageCount}
            pageSize={data.pageSize}
            total={data.total}
            onPage={(page) => setState({ page })}
            onPageSize={(s) => setState({ size: s })}
          />
        </div>
      )}
    </ListCard>
  );
}

export function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[82px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[480px] rounded-2xl" />
    </div>
  );
}
