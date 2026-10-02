"use client";

import { FunnelSimpleIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { FilterSelect, ListCard, PageHeader, PageShell, PrimaryButton, SecondaryButton, FilterBar, type SelectOption } from "@/components/shared/desk-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { useLookups, useTickets, useViewCounts } from "@/hooks/use-tickets";
import { useHydrated } from "@/hooks/use-hydrated";
import { useTicketQuery } from "@/hooks/use-ticket-query";
import { countActiveFilters, EMPTY_FILTERS, type FilterKey, type TicketFilters } from "@/lib/schemas/ticket";
import { PRIORITY_META, STATUS_META } from "@/lib/ticket-meta";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/lib/types/ticket";
import { useNewTicket } from "./new-ticket-dialog";
import { ActiveFilterChips, KEY_LABEL, TicketFiltersButton } from "./ticket-filters";
import { TicketPagination } from "./ticket-pagination";
import { TicketSearch } from "./ticket-search";
import { TicketTable, TicketTableSkeleton } from "./ticket-table";
import { TicketKpis, viewOptions } from "./ticket-views";
import { VIEW_META } from "./ticket-views-config";

/** Filters shown as dropdowns in the bar; the rest live in the "More filters" drawer and show as chips. */
const BAR_KEYS = ["status", "priority", "assignee"] as const satisfies readonly FilterKey[];
type BarKey = (typeof BAR_KEYS)[number];

/** Single-select dropdown over an array filter. Several values (set in the drawer) read as "N selected". */
function barValue(values: string[]) {
  return values.length === 1 ? values[0] : values.length > 1 ? "__multi" : "";
}
function withMulti(options: SelectOption[], values: string[], key: FilterKey): SelectOption[] {
  return values.length > 1 ? [{ value: "__multi", label: `${values.length} ${KEY_LABEL[key].toLowerCase()} selected` }, ...options] : options;
}

/** The /tickets workspace — ServiceOps list layout: header, KPI quick filters, filter bar, table, pagination. */
export function TicketList() {
  const { openNewTicket } = useNewTicket();
  const { query, setQuery, filters, setFilters, clearFilters } = useTicketQuery();
  const { data, isPending, isError, isPlaceholderData, refetch } = useTickets(query);
  const { data: counts } = useViewCounts();
  const { data: lookups } = useLookups();
  const activeFilters = countActiveFilters(filters);
  const narrowed = activeFilters > 0 || query.q.length > 0;
  const view = VIEW_META[query.view];
  const hydrated = useHydrated();

  const setBar = (key: BarKey, v: string) => {
    if (v === "__multi") return;
    setFilters({ ...filters, [key]: v ? [v] : [] } as TicketFilters);
  };

  const statusOptions = TICKET_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }));
  const priorityOptions = [...TICKET_PRIORITIES].reverse().map((p) => ({ value: p, label: PRIORITY_META[p].label }));
  const assigneeOptions: SelectOption[] = [
    ...(lookups?.agents ?? []).map((a) => ({ value: a.id, label: a.id === lookups?.currentAgentId ? `${a.name} (me)` : a.name })),
    { value: "unassigned", label: "Unassigned" },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Tickets"
        subtitle="Manage and resolve customer support requests."
        actions={
          <PrimaryButton icon={PlusIcon} onClick={openNewTicket}>
            New ticket
          </PrimaryButton>
        }
      />

      <TicketKpis active={query.view} counts={hydrated ? counts : undefined} onSelect={(v) => setQuery({ ...EMPTY_FILTERS, view: v, q: query.q })} />

      <ListCard>
        <FilterBar
          activeCount={activeFilters + (query.view !== "all" ? 1 : 0)}
          search={<TicketSearch value={query.q} onChange={(q) => setQuery({ q })} />}
          trailing={
            <TicketFiltersButton
              filters={filters}
              sort={query.sort}
              onApply={(f, sort) => setQuery({ ...f, sort })}
            />
          }
        >
          <FilterSelect
            label="View"
            value={query.view === "all" ? "" : query.view}
            placeholder="All tickets"
            options={viewOptions(hydrated ? counts : undefined)}
            onChange={(v) => setQuery({ view: (v || "all") as typeof query.view })}
            className="sm:w-[176px]"
          />
          <FilterSelect
            label="Status"
            value={barValue(filters.status)}
            placeholder="All status"
            options={withMulti(statusOptions, filters.status, "status")}
            onChange={(v) => setBar("status", v)}
            className="sm:w-[150px]"
          />
          <FilterSelect
            label="Priority"
            value={barValue(filters.priority)}
            placeholder="Any priority"
            options={withMulti(priorityOptions, filters.priority, "priority")}
            onChange={(v) => setBar("priority", v)}
            className="sm:w-[150px]"
          />
          <FilterSelect
            label="Assignee"
            value={barValue(filters.assignee)}
            placeholder="Any assignee"
            options={withMulti(assigneeOptions, filters.assignee, "assignee")}
            onChange={(v) => setBar("assignee", v)}
            className="sm:w-[176px]"
          />
        </FilterBar>

        <ActiveFilterChips filters={filters} hidden={[...BAR_KEYS]} onChange={setFilters} onClear={clearFilters} />

        {!hydrated || isPending ? (
          <TicketTableSkeleton />
        ) : isError ? (
          <ErrorState
            title="Unable to load tickets"
            hint="Something went wrong while loading this view. Your filters are kept — try again."
            action={<SecondaryButton onClick={() => refetch()}>Try again</SecondaryButton>}
          />
        ) : data.total === 0 ? (
          narrowed ? (
            <EmptyState
              icon={query.q ? MagnifyingGlassIcon : FunnelSimpleIcon}
              title="No tickets match your filters"
              hint={
                query.q
                  ? `Nothing in ${view.label} matches “${query.q}”. Check the spelling or search by ticket ID or email.`
                  : `No tickets in ${view.label} match the selected filters.`
              }
              action={
                <SecondaryButton onClick={() => setQuery({ ...EMPTY_FILTERS, q: "" })}>
                  Clear {query.q && activeFilters ? "search and filters" : query.q ? "search" : "filters"}
                </SecondaryButton>
              }
            />
          ) : (
            <EmptyState icon={view.icon} title={view.empty.title} hint={view.empty.hint} />
          )
        ) : (
          <>
            <TicketTable tickets={data.items} sort={query.sort} onSort={(sort) => setQuery({ sort })} dimmed={isPlaceholderData} />
            <TicketPagination
              page={data.page}
              pageCount={data.pageCount}
              pageSize={data.pageSize}
              total={data.total}
              onPage={(page) => {
                setQuery({ page });
                window.scrollTo({ top: 0 });
              }}
              onPageSize={(size) => setQuery({ size })}
            />
          </>
        )}
      </ListCard>
    </PageShell>
  );
}
