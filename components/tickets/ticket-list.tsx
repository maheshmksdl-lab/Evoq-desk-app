"use client";

import { useEffect, useState } from "react";
import {
  ArrowClockwiseIcon,
  DotsThreeIcon,
  FunnelSimpleIcon,
  FunnelXIcon,
  ListIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  RowsIcon,
} from "@phosphor-icons/react/dist/ssr";
import { FilterSelect, ListCard, PageShell, SecondaryButton, type SelectOption } from "@/components/shared/desk-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { usePreference } from "@/hooks/use-preference";
import { usePrefetchTicket } from "@/hooks/use-ticket";
import { useLookups, useTickets, useViewCounts } from "@/hooks/use-tickets";
import { useHydrated } from "@/hooks/use-hydrated";
import { useTicketQuery } from "@/hooks/use-ticket-query";
import { countActiveFilters, EMPTY_FILTERS, SLA_FILTER_STATES, type FilterKey, type TicketFilters } from "@/lib/schemas/ticket";
import { PRIORITY_META, SLA_META, SOURCE_LABEL, STATUS_META } from "@/lib/ticket-meta";
import { TICKET_PRIORITIES, TICKET_SOURCES, TICKET_STATUSES } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { useNewTicket } from "./new-ticket-dialog";
import { TicketBulkBar } from "./ticket-bulk-bar";
import { ActiveFilterChips, KEY_LABEL, TicketFiltersButton } from "./ticket-filters";
import { OpenTicketProvider } from "./ticket-link";
import { TicketPagination } from "./ticket-pagination";
import type { ListDensity } from "./ticket-row";
import { TicketSearch } from "./ticket-search";
import { TicketTable, TicketTableSkeleton } from "./ticket-table";
import { TicketViewSwitcher } from "./ticket-views";
import { VIEW_META } from "./ticket-views-config";
import { TicketWorkspace, type QueuePosition } from "./ticket-workspace";

/** Filters shown as pills in the toolbar; the rest live in the "More filters" drawer and show as chips. */
const BAR_KEYS = ["status", "priority", "assignee", "team", "source", "sla", "tags"] as const satisfies readonly FilterKey[];
type BarKey = (typeof BAR_KEYS)[number];

/** Pill label in the toolbar ("Channel" reads better than "Source" next to the Channel column). */
const BAR_LABEL: Record<BarKey, string> = { status: "Status", priority: "Priority", assignee: "Assignee", team: "Team", source: "Channel", sla: "SLA", tags: "Tags" };

const DENSITIES = ["comfortable", "compact"] as const satisfies readonly ListDensity[];

const squareButton =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink-body transition-colors hover:border-desk hover:text-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action data-[state=open]:border-desk";

/** Single-select dropdown over an array filter. Several values (set in the drawer) read as "N selected". */
function barValue(values: string[]) {
  return values.length === 1 ? values[0] : values.length > 1 ? "__multi" : "";
}
function withMulti(options: SelectOption[], values: string[], key: FilterKey): SelectOption[] {
  return values.length > 1 ? [{ value: "__multi", label: `${values.length} ${KEY_LABEL[key].toLowerCase()} selected` }, ...options] : options;
}

/**
 * The ticket listing — where agents work. The list (view, filters, table) and,
 * once a ticket is selected, its workspace docked on the right: the list stays
 * in view, with the open ticket highlighted. Selecting, switching and closing
 * tickets only changes the URL (/tickets/<id>), never the page.
 */
export function TicketList() {
  const { openNewTicket } = useNewTicket();
  const { query, setQuery, filters, setFilters, clearFilters, openTicket } = useTicketQuery();
  // The open ticket isn't part of the list query, so opening one doesn't refetch the list.
  const { data, isPending, isError, isPlaceholderData, refetch } = useTickets({ ...query, open: undefined });
  const { data: counts } = useViewCounts();
  const { data: lookups } = useLookups();
  const prefetch = usePrefetchTicket();
  const [density, setDensity] = usePreference<ListDensity>("desk-list-density", "comfortable", DENSITIES);
  const [searching, setSearching] = useState(false);
  const activeFilters = countActiveFilters(filters);
  const narrowed = activeFilters > 0 || query.q.length > 0;
  const view = VIEW_META[query.view];
  const hydrated = useHydrated();
  const openId = query.open;
  const showSearch = searching || query.q.length > 0;

  // Selection belongs to the rows on screen: it resets whenever the list query changes.
  const listKey = JSON.stringify({ ...query, open: undefined });
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>({ key: listKey, ids: new Set() });
  const selected = selection.key === listKey ? selection.ids : new Set<string>();
  const setSelected = (ids: Set<string>) => setSelection({ key: listKey, ids });
  const visibleSelected = (data?.items ?? []).filter((t) => selected.has(t.id));

  // Position of the open ticket in the list → previous / next without going back to it.
  const items = data?.items ?? [];
  const index = openId ? items.findIndex((t) => t.id === openId) : -1;
  const goTo = (i: number) => items[i] && openTicket(items[i].id);
  const position: QueuePosition | undefined =
    index >= 0
      ? {
          index,
          total: items.length,
          onPrev: index > 0 ? () => goTo(index - 1) : undefined,
          onNext: index < items.length - 1 ? () => goTo(index + 1) : undefined,
        }
      : undefined;
  useKeyboardShortcuts(
    [
      { key: "j", handler: () => position?.onNext?.() },
      { key: "k", handler: () => position?.onPrev?.() },
    ],
    !!openId,
  );

  // Warm the neighbours so moving through the list is instant, and keep the open ticket's row in view.
  const prevId = index > 0 ? items[index - 1]?.id : undefined;
  const nextId = index >= 0 ? items[index + 1]?.id : undefined;
  useEffect(() => {
    if (prevId) prefetch(prevId);
    if (nextId) prefetch(nextId);
  }, [prevId, nextId, prefetch]);
  useEffect(() => {
    if (!openId) return;
    for (const el of document.querySelectorAll(`[data-ticket-id="${openId}"]`)) {
      if ((el as HTMLElement).offsetParent) el.scrollIntoView({ block: "nearest" });
    }
  }, [openId, isPending]);

  // The URL changes without a navigation, so keep the tab title in step.
  const openNumber = items[index]?.ticketNumber ?? openId;
  useEffect(() => {
    document.title = `${openId ? `#${openNumber}` : view.label} · Desk`;
  }, [openId, openNumber, view.label]);

  // Esc closes the workspace (unless focus is in a field, menu or dialog).
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable=true], [role=dialog], [role=menu], [cmdk-root]")) return;
      openTicket(undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, openTicket]);

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

  const DensityIcon = density === "compact" ? RowsIcon : ListIcon;

  return (
    <OpenTicketProvider value={openTicket}>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          openId && "md:grid md:grid-cols-[minmax(0,1fr)_55%] md:items-start lg:grid-cols-[minmax(0,1fr)_minmax(460px,42%)] 2xl:grid-cols-[minmax(0,1fr)_600px]",
        )}
      >
        <PageShell className={cn("space-y-0", openId && "lg:px-6")}>
          <ListCard className="overflow-hidden p-0 sm:p-0">
            <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
              <TicketViewSwitcher
                active={query.view}
                counts={hydrated ? counts : undefined}
                onSelect={(v) => setQuery({ ...EMPTY_FILTERS, view: v, q: query.q, open: undefined })}
              />
              <DropdownMenu>
                <DropdownMenuTrigger aria-label="List actions" className={cn(squareButton, "size-10")}>
                  <DotsThreeIcon size={20} weight="bold" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onSelect={openNewTicket}>
                    <PlusIcon size={15} aria-hidden /> New ticket <DropdownMenuShortcut>C</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setSearching(true)}>
                    <MagnifyingGlassIcon size={15} aria-hidden /> Search this view
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => refetch()}>
                    <ArrowClockwiseIcon size={15} aria-hidden /> Refresh
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={!narrowed} onSelect={() => setQuery({ ...EMPTY_FILTERS, q: "" })}>
                    <FunnelXIcon size={15} aria-hidden /> Clear filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {visibleSelected.length > 0 ? (
              <TicketBulkBar tickets={visibleSelected} onClear={() => setSelected(new Set())} />
            ) : (
              <div className="flex items-center gap-2 px-4 pb-3 sm:px-5">
                <div role="toolbar" aria-label="Filter tickets" className="scrollbar-none flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
                  {showSearch && (
                    <TicketSearch
                      value={query.q}
                      onChange={(q) => setQuery({ q })}
                      autoFocus={searching && !query.q}
                      onBlurEmpty={() => setSearching(false)}
                      className="h-8 w-56 shrink-0 rounded-lg border-line bg-card sm:w-56"
                    />
                  )}
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
                  {!showSearch && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" onClick={() => setSearching(true)} aria-label="Search this view" className={cn(squareButton, "size-8")}>
                          <MagnifyingGlassIcon size={16} aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Search this view</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
                      aria-label={density === "compact" ? "Comfortable rows" : "Compact rows"}
                      aria-pressed={density === "compact"}
                      className={cn(squareButton, "size-8")}
                    >
                      <DensityIcon size={17} aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{density === "compact" ? "Comfortable rows" : "Compact rows"}</TooltipContent>
                </Tooltip>
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
                  onOpen={openTicket}
                  onIntent={prefetch}
                  density={density}
                />
                <TicketPagination
                  page={data.page}
                  pageCount={data.pageCount}
                  pageSize={data.pageSize}
                  total={data.total}
                  compact={!!openId}
                  onPage={(page) => {
                    setQuery({ page }, { keepPage: true });
                    window.scrollTo({ top: 0 });
                  }}
                  onPageSize={(size) => setQuery({ size })}
                />
              </>
            )}
          </ListCard>
        </PageShell>
        {/* One workspace for the session: switching tickets swaps its content, it never remounts the list. */}
        {openId && <TicketWorkspace ticketId={openId} onClose={() => openTicket(undefined)} position={position} />}
      </div>
    </OpenTicketProvider>
  );
}
