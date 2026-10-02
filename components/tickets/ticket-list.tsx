"use client";

import { useEffect, useState } from "react";
import { FunnelSimpleIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { FilterSelect, ListCard, PageShell, PrimaryButton, SecondaryButton, type SelectOption } from "@/components/shared/desk-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { useLookups, useTickets, useViewCounts } from "@/hooks/use-tickets";
import { useHydrated } from "@/hooks/use-hydrated";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTicketQuery } from "@/hooks/use-ticket-query";
import { countActiveFilters, EMPTY_FILTERS, SLA_FILTER_STATES, type FilterKey, type TicketFilters } from "@/lib/schemas/ticket";
import { PRIORITY_META, SLA_META, SOURCE_LABEL, STATUS_META } from "@/lib/ticket-meta";
import { TICKET_PRIORITIES, TICKET_SOURCES, TICKET_STATUSES } from "@/lib/types/ticket";
import { useNewTicket } from "./new-ticket-dialog";
import { TicketBulkBar } from "./ticket-bulk-bar";
import { ActiveFilterChips, KEY_LABEL, TicketFiltersButton } from "./ticket-filters";
import { TicketPagination } from "./ticket-pagination";
import { TicketPreviewPane } from "./ticket-preview-pane";
import { TicketSearch } from "./ticket-search";
import { TicketTable, TicketTableSkeleton } from "./ticket-table";
import { TicketViewSwitcher } from "./ticket-views";
import { VIEW_META } from "./ticket-views-config";
import { cn } from "@/lib/utils";

/** Filters shown as pills in the toolbar; the rest live in the "More filters" drawer and show as chips. */
const BAR_KEYS = ["status", "priority", "assignee", "team", "source", "sla", "tags"] as const satisfies readonly FilterKey[];
type BarKey = (typeof BAR_KEYS)[number];

/** Pill label in the toolbar ("Channel" reads better than "Source" next to the Channel column). */
const BAR_LABEL: Record<BarKey, string> = { status: "Status", priority: "Priority", assignee: "Assignee", team: "Team", source: "Channel", sla: "SLA", tags: "Tags" };

/** Wide enough to show the ticket beside the list; narrower screens open the full ticket page. */
const SPLIT_QUERY = "(min-width: 1440px)";

/** Single-select dropdown over an array filter. Several values (set in the drawer) read as "N selected". */
function barValue(values: string[]) {
  return values.length === 1 ? values[0] : values.length > 1 ? "__multi" : "";
}
function withMulti(options: SelectOption[], values: string[], key: FilterKey): SelectOption[] {
  return values.length > 1 ? [{ value: "__multi", label: `${values.length} ${KEY_LABEL[key].toLowerCase()} selected` }, ...options] : options;
}

/**
 * The /tickets workspace: view title + actions, filter pills (or bulk actions
 * while rows are selected), dense table, compact footer — and, on wide screens,
 * the open ticket in a panel beside the list.
 */
export function TicketList() {
  const { openNewTicket } = useNewTicket();
  const { query, setQuery, filters, setFilters, clearFilters } = useTicketQuery();
  // The open ticket isn't part of the list query, so opening one doesn't refetch the list.
  const { data, isPending, isError, isPlaceholderData, refetch } = useTickets({ ...query, open: undefined });
  const { data: counts } = useViewCounts();
  const { data: lookups } = useLookups();
  const activeFilters = countActiveFilters(filters);
  const narrowed = activeFilters > 0 || query.q.length > 0;
  const view = VIEW_META[query.view];
  const hydrated = useHydrated();
  const split = useMediaQuery(SPLIT_QUERY, false);
  const openId = split ? query.open : undefined;

  // Selection belongs to the rows on screen: it resets whenever the list query changes.
  const listKey = JSON.stringify({ ...query, open: undefined });
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>({ key: listKey, ids: new Set() });
  const selected = selection.key === listKey ? selection.ids : new Set<string>();
  const setSelected = (ids: Set<string>) => setSelection({ key: listKey, ids });
  const visibleSelected = (data?.items ?? []).filter((t) => selected.has(t.id)).map((t) => t.id);

  const openTicket = (id: string | undefined) => setQuery({ open: id }, { keepPage: true });

  // Esc closes the side panel (unless focus is in a field, menu or dialog).
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable=true], [role=dialog], [role=menu]")) return;
      setQuery({ open: undefined }, { keepPage: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, setQuery]);

  const setBar = (key: BarKey, v: string) => {
    if (v === "__multi") return;
    setFilters({ ...filters, [key]: v ? [v] : [] } as TicketFilters);
  };

  const barOptions: Record<BarKey, SelectOption[]> = {
    status: TICKET_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label })),
    priority: [...TICKET_PRIORITIES].reverse().map((p) => ({ value: p, label: PRIORITY_META[p].label })),
    assignee: [
      ...(lookups?.agents ?? []).map((a) => ({ value: a.id, label: a.id === lookups?.currentAgentId ? `${a.name} (me)` : a.name })),
      { value: "unassigned", label: "Unassigned" },
    ],
    team: (lookups?.teams ?? []).map((t) => ({ value: t.id, label: t.name })),
    source: TICKET_SOURCES.map((s) => ({ value: s, label: SOURCE_LABEL[s] })),
    sla: SLA_FILTER_STATES.map((s) => ({ value: s, label: SLA_META[s].label })),
    tags: (lookups?.tags ?? []).map((t) => ({ value: t, label: t })),
  };

  return (
    <PageShell className={cn("space-y-0", openId && "grid grid-cols-[minmax(0,1fr)_minmax(440px,40%)] items-start gap-4")}>
      <ListCard className="overflow-hidden p-0 sm:p-0">
        <div className="flex flex-col gap-3 px-4 pt-4 pb-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <TicketViewSwitcher
            active={query.view}
            counts={hydrated ? counts : undefined}
            onSelect={(v) => setQuery({ ...EMPTY_FILTERS, view: v, q: query.q })}
          />
          <div className="flex shrink-0 items-center gap-2">
            <TicketSearch value={query.q} onChange={(q) => setQuery({ q })} className="h-9 flex-1 rounded-lg border-line bg-card sm:w-[260px] sm:flex-none" />
            <PrimaryButton icon={PlusIcon} size="md" onClick={openNewTicket} className="h-9 rounded-lg px-3.5 shadow-none">
              <span className="max-sm:sr-only">New ticket</span>
            </PrimaryButton>
          </div>
        </div>

        {visibleSelected.length > 0 ? (
          <TicketBulkBar ids={visibleSelected} onClear={() => setSelected(new Set())} />
        ) : (
        <div role="toolbar" aria-label="Filter tickets" className="scrollbar-none flex items-center gap-2 overflow-x-auto px-4 pb-3 sm:flex-wrap sm:px-5">
          {BAR_KEYS.map((key) => (
            <FilterSelect
              key={key}
              variant="pill"
              label={BAR_LABEL[key]}
              value={barValue(filters[key])}
              placeholder={BAR_LABEL[key]}
              resetLabel={`Any ${BAR_LABEL[key].toLowerCase()}`}
              options={withMulti(barOptions[key], filters[key], key)}
              onChange={(v) => setBar(key, v)}
              className="shrink-0"
            />
          ))}
          <TicketFiltersButton filters={filters} sort={query.sort} onApply={(f, sort) => setQuery({ ...f, sort })} />
        </div>
        )}

        <ActiveFilterChips filters={filters} hidden={[...BAR_KEYS]} onChange={setFilters} onClear={clearFilters} />

        {!hydrated || isPending ? (
          <TicketTableSkeleton />
        ) : isError ? (
          <div className="border-t border-line p-4">
            <ErrorState
              title="Unable to load tickets"
              hint="Something went wrong while loading this view. Your filters are kept — try again."
              action={<SecondaryButton onClick={() => refetch()}>Try again</SecondaryButton>}
            />
          </div>
        ) : data.total === 0 ? (
          <div className="border-t border-line p-4">
            {narrowed ? (
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
            )}
          </div>
        ) : (
          <>
            <TicketTable
              tickets={data.items}
              sort={query.sort}
              onSort={(sort) => setQuery({ sort })}
              dimmed={isPlaceholderData}
              selected={selected}
              onSelectionChange={setSelected}
              openId={openId}
              onOpen={split ? openTicket : undefined}
            />
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
      {openId && <TicketPreviewPane ticketId={openId} onClose={() => openTicket(undefined)} />}
    </PageShell>
  );
}
