"use client";

import { useEffect, useState } from "react";
import {
  CaretDownIcon,
  ChatsCircleIcon,
  CheckCircleIcon,
  CheckIcon,
  FunnelSimpleIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
} from "@phosphor-icons/react/dist/ssr";
import { INBOX_QUEUES, queueLabel } from "@/components/layout/nav-config";
import { FilterSelect, SecondaryButton, type SelectOption } from "@/components/shared/desk-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHydrated } from "@/hooks/use-hydrated";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useNow } from "@/hooks/use-now";
import { usePrefetchTicket } from "@/hooks/use-ticket";
import { useTicketQuery } from "@/hooks/use-ticket-query";
import { useLookups, useTickets, useViewCounts } from "@/hooks/use-tickets";
import { countActiveFilters, EMPTY_FILTERS, type TicketFilters } from "@/lib/schemas/ticket";
import { PRIORITY_META, SOURCE_LABEL, STATUS_META } from "@/lib/ticket-meta";
import { TICKET_PRIORITIES, TICKET_STATUSES, type TicketPriority, type TicketSource, type TicketSummary } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { useNewTicket } from "./new-ticket-dialog";
import { TicketBulkBar } from "./ticket-bulk-bar";
import { ActiveFilterChips, TicketFiltersButton } from "./ticket-filters";
import { OpenTicketProvider } from "./ticket-link";
import { TicketPagination } from "./ticket-pagination";
import { TicketSearch } from "./ticket-search";
import { SlaLeft } from "./ticket-sla-indicator";
import { SOURCE_ICON } from "./ticket-source-badge";
import { VIEW_META } from "./ticket-views-config";
import { TicketWorkspace, type QueuePosition } from "./ticket-workspace";

/** Filters with their own dropdown in the Inbox toolbar; the rest live behind the filters button. */
const BAR_KEYS = ["status", "priority", "team"] as const;
type BarKey = (typeof BAR_KEYS)[number];
const BAR_LABEL: Record<BarKey, string> = { status: "Status", priority: "Priority", team: "Team" };

export const PRIORITY_BADGE: Record<TicketPriority, string> = {
  urgent: "bg-[#FEF2F2] text-[#EF4444]",
  high: "bg-[#FEF2F2] text-[#EF4444]",
  medium: "bg-[#FFF7ED] text-[#EA580C]",
  low: "bg-[#F3F4F6] text-[#4B5563]",
};

export const SOURCE_TONE: Partial<Record<TicketSource, string>> = {
  email: "text-[#3B82F6]",
  web_form: "text-[#3B82F6]",
  portal: "text-[#3B82F6]",
  chat: "text-[#8B5CF6]",
  social: "text-[#8B5CF6]",
};

/** Single value of an array filter for a dropdown; several (set in the drawer) read as "N selected". */
function barValue(values: string[]) {
  return values.length === 1 ? values[0] : values.length > 1 ? "__multi" : "";
}

const toolButton =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink-body transition-colors hover:border-desk hover:text-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action data-[state=open]:border-desk";

/**
 * The Inbox: a queue's conversations on the left and the open ticket's
 * workspace beside them. Like the ticket list, all state lives in the URL —
 * selecting and switching tickets never remounts the queue.
 */
export function InboxView() {
  const { openNewTicket } = useNewTicket();
  const { query, setQuery, filters, setFilters, clearFilters, openTicket } = useTicketQuery();
  const { data, isPending, isError, isPlaceholderData, refetch } = useTickets({ ...query, open: undefined });
  const { data: counts } = useViewCounts();
  const { data: lookups } = useLookups();
  const prefetch = usePrefetchTicket();
  const hydrated = useHydrated();
  const now = useNow();
  const openId = query.open;
  const activeFilters = countActiveFilters(filters);
  const narrowed = activeFilters > 0 || query.q.length > 0;
  const view = VIEW_META[query.view];
  const team = filters.team.length === 1 ? lookups?.teams.find((t) => t.id === filters.team[0]) : undefined;
  const title = team?.name ?? queueLabel(query.view) ?? view.label;

  // Selection belongs to the rows on screen: it resets whenever the list query changes.
  const listKey = JSON.stringify({ ...query, open: undefined });
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>({ key: listKey, ids: new Set() });
  const selected = selection.key === listKey ? selection.ids : new Set<string>();
  const setSelected = (ids: Set<string>) => setSelection({ key: listKey, ids });
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (!next.delete(id)) next.add(id);
    setSelected(next);
  };

  const items = data?.items ?? [];
  const visibleSelected = items.filter((t) => selected.has(t.id));
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

  // Warm the neighbours so moving through the queue is instant, and keep the open row in view.
  const prevId = index > 0 ? items[index - 1]?.id : undefined;
  const nextId = index >= 0 ? items[index + 1]?.id : undefined;
  useEffect(() => {
    if (prevId) prefetch(prevId);
    if (nextId) prefetch(nextId);
  }, [prevId, nextId, prefetch]);
  useEffect(() => {
    if (!openId) return;
    document.querySelector(`[data-ticket-id="${openId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [openId, isPending]);

  // The URL changes without a navigation, so keep the tab title in step.
  const openNumber = items[index]?.ticketNumber ?? openId;
  useEffect(() => {
    document.title = `${openId ? `#${openNumber}` : title} · Desk`;
  }, [openId, openNumber, title]);

  // Esc closes the open ticket (unless focus is in a field, menu or dialog).
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

  const barOptions: Record<BarKey, SelectOption[]> = {
    status: TICKET_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label })),
    priority: [...TICKET_PRIORITIES].reverse().map((p) => ({ value: p, label: PRIORITY_META[p].label })),
    team: (lookups?.teams ?? []).map((t) => ({ value: t.id, label: t.name })),
  };
  const setBar = (key: BarKey, v: string) => {
    if (v === "__multi") return;
    setFilters({ ...filters, [key]: v ? [v] : [] } as TicketFilters);
  };

  return (
    <OpenTicketProvider value={openTicket}>
      <div className="flex h-[calc(100dvh-64px)] min-w-0 gap-3 overflow-hidden md:p-3 lg:h-[calc(100dvh-var(--header-h))]">
        {/* ── Conversation list ── */}
        <section
          aria-label={`${title} conversations`}
          className="flex w-full min-w-0 shrink-0 flex-col overflow-hidden bg-card md:w-[340px] md:rounded-2xl md:border md:border-line-soft md:shadow-card xl:w-[380px] 2xl:w-[460px]"
        >
          <header className="shrink-0 px-4 pt-4 sm:px-5 sm:pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-[22px] leading-7 font-bold tracking-tight text-ink">{title}</h1>
                <p className="mt-0.5 text-[15px] leading-6 text-ink-muted">
                  {data && hydrated ? `${data.total} ${data.total === 1 ? "conversation" : "conversations"}` : " "}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={openNewTicket} aria-label="New ticket" className={toolButton}>
                    <NotePencilIcon size={19} aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent>New ticket (C)</TooltipContent>
              </Tooltip>
            </div>

            {visibleSelected.length > 0 ? (
              <div className="-mx-4 mt-4 sm:-mx-5 [&>[role=toolbar]]:pb-0">
                <TicketBulkBar tickets={visibleSelected} onClear={() => setSelected(new Set())} />
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2">
                <div role="toolbar" aria-label="Filter conversations" className="scrollbar-none flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-desk/30 bg-desk-tint px-3 text-[13px] font-medium text-desk transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action data-[state=open]:border-desk">
                      Views
                      <CaretDownIcon size={12} aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-60 rounded-xl">
                      {INBOX_QUEUES.map((q) => {
                        const QueueIcon = q.icon;
                        const on = q.view === query.view && !team;
                        return (
                          <DropdownMenuItem
                            key={q.view}
                            onSelect={() => setQuery({ ...EMPTY_FILTERS, view: q.view, q: query.q, open: undefined })}
                            className={cn("rounded-lg", on && "bg-desk-tint")}
                          >
                            <QueueIcon size={16} aria-hidden className={on ? "text-desk" : "text-ink-muted"} />
                            <span className="flex-1">{q.label}</span>
                            {q.counted && counts && <span className="text-caption text-ink-muted tabular-nums">{counts[q.view]}</span>}
                            {on && <CheckIcon size={14} aria-hidden className="text-desk" />}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {BAR_KEYS.map((key) => (
                    <FilterSelect
                      key={key}
                      variant="pill"
                      label={BAR_LABEL[key]}
                      value={barValue(filters[key])}
                      placeholder={BAR_LABEL[key]}
                      resetLabel={`Any ${BAR_LABEL[key].toLowerCase()}`}
                      options={filters[key].length > 1 ? [{ value: "__multi", label: `${filters[key].length} selected` }, ...barOptions[key]] : barOptions[key]}
                      onChange={(v) => setBar(key, v)}
                      className="h-9 shrink-0 gap-2 px-3"
                    />
                  ))}
                </div>
                {/* Outside the scrolling strip, so More filters stays reachable however narrow the list gets. */}
                <span className="shrink-0 [&>button]:h-9 [&>button]:w-9 [&>button]:px-0">
                  <TicketFiltersButton filters={filters} sort={query.sort} onApply={(f, sort) => setQuery({ ...f, sort })} />
                </span>
              </div>
            )}

            <TicketSearch
              value={query.q}
              onChange={(q) => setQuery({ q })}
              placeholder="Search conversations..."
              className="mt-3 h-10 w-full rounded-lg border-transparent bg-[#F4F6F8] sm:w-full [&_input]:placeholder:text-ink-muted"
            />
          </header>

          <div className="[&>div]:px-4 [&>div]:pt-3 [&>div]:pb-0 sm:[&>div]:px-5">
            <ActiveFilterChips filters={filters} hidden={[...BAR_KEYS]} onChange={setFilters} onClear={clearFilters} />
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line-soft scrollbar-thin">
            {!hydrated || isPending ? (
              <ConversationSkeleton />
            ) : isError ? (
              <div className="p-4">
                <ErrorState
                  title="Unable to load conversations"
                  hint="Something went wrong while loading this queue. Your filters are kept — try again."
                  action={<SecondaryButton onClick={() => refetch()}>Try again</SecondaryButton>}
                />
              </div>
            ) : data.total === 0 ? (
              <div className="p-4">
                {narrowed ? (
                  <EmptyState
                    icon={query.q ? MagnifyingGlassIcon : FunnelSimpleIcon}
                    title="No conversations match"
                    hint={query.q ? `Nothing in ${title} matches “${query.q}”.` : `No conversations in ${title} match the selected filters.`}
                    action={<SecondaryButton onClick={() => setQuery({ ...EMPTY_FILTERS, q: "" })}>Clear {query.q ? "search" : "filters"}</SecondaryButton>}
                  />
                ) : (
                  <EmptyState icon={view.icon} title={view.empty.title} hint={view.empty.hint} />
                )}
              </div>
            ) : (
              <>
                <ul aria-label={`${title} conversations`} className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
                  {data.items.map((t) => (
                    <ConversationRow
                      key={t.id}
                      ticket={t}
                      now={now}
                      open={t.id === openId}
                      checked={selected.has(t.id)}
                      selecting={selected.size > 0}
                      onToggle={() => toggle(t.id)}
                      onOpen={() => openTicket(t.id)}
                      onIntent={() => prefetch(t.id)}
                    />
                  ))}
                </ul>
                {data.pageCount > 1 && (
                  <TicketPagination
                    page={data.page}
                    pageCount={data.pageCount}
                    pageSize={data.pageSize}
                    total={data.total}
                    compact
                    onPage={(page) => setQuery({ page }, { keepPage: true })}
                    onPageSize={(size) => setQuery({ size })}
                  />
                )}
              </>
            )}
          </div>
        </section>

        {/* ── Open ticket ── */}
        {openId ? (
          <TicketWorkspace ticketId={openId} onClose={() => openTicket(undefined)} position={position} variant="inbox" />
        ) : (
          <div className="hidden min-w-0 flex-1 items-center justify-center rounded-2xl border border-line-soft bg-card shadow-card md:flex">
            <EmptyState icon={ChatsCircleIcon} title="Select a conversation" hint="Pick a conversation from the list to read the thread and reply." />
          </div>
        )}
      </div>
    </OpenTicketProvider>
  );
}

function ConversationRow({
  ticket: t,
  now,
  open,
  checked,
  selecting,
  onToggle,
  onOpen,
  onIntent,
}: {
  ticket: TicketSummary;
  now: number;
  open: boolean;
  checked: boolean;
  selecting: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onIntent: () => void;
}) {
  const SourceIcon = SOURCE_ICON[t.source];
  return (
    <li
      data-ticket-id={t.id}
      className={cn(
        "group relative border-b border-line-soft transition-colors last:border-b-0",
        open ? "bg-desk-tint before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-desk" : checked ? "bg-desk-surface" : "hover:bg-desk-surface",
      )}
    >
      {/* Avatar doubles as the bulk-select checkbox on hover (or once anything is selected). */}
      <span className="absolute top-4 left-4 sm:left-5">
        <span className={cn("block transition-opacity", selecting || checked ? "opacity-0" : "group-hover:opacity-0 group-focus-within:opacity-0")}>
          <PersonAvatar name={t.contact.name} src={t.contact.avatar} size="xl" className="[&_[data-slot=avatar]]:size-12" />
        </span>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity",
            selecting || checked ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={`Select ticket #${t.ticketNumber}`} className="size-5 border-ink-faint bg-card" />
        </span>
      </span>
      <button
        type="button"
        onClick={onOpen}
        onMouseEnter={onIntent}
        onFocus={onIntent}
        aria-current={open ? "true" : undefined}
        aria-label={`#${t.ticketNumber} ${t.subject}, from ${t.contact.name}`}
        className="flex w-full gap-4 py-4 pr-4 pl-[84px] text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-desk-action sm:pr-5 sm:pl-[88px]"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-3">
            <span className="min-w-0 flex-1 truncate text-[15px] leading-6 font-semibold text-ink">{t.subject}</span>
            {!open && <TimeLabel iso={t.updatedAt} className="shrink-0 text-[13px] leading-5 text-ink-muted" />}
          </span>
          <span className="mt-0.5 flex items-start gap-3">
            <span className="line-clamp-2 min-w-0 flex-1 text-[14px] leading-[21px] text-ink-muted">{t.preview}</span>
            <span className="flex shrink-0 flex-col items-end gap-1.5">
              <SlaLeft sla={t.sla} now={now} />
              <span className="flex items-center gap-3">
                <span className={cn("shrink-0", SOURCE_TONE[t.source] ?? "text-ink-muted")} title={SOURCE_LABEL[t.source]}>
                  <SourceIcon size={19} aria-hidden />
                  <span className="sr-only">Via {SOURCE_LABEL[t.source]}</span>
                </span>
                <span className={cn("rounded-md px-3 py-[3px] text-[12px] leading-4 font-medium", PRIORITY_BADGE[t.priority])}>{PRIORITY_META[t.priority].label}</span>
              </span>
            </span>
          </span>
          {t.status !== "open" && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] leading-4 text-ink-muted">
              {t.status === "resolved" || t.status === "closed" ? <CheckCircleIcon size={13} aria-hidden /> : <span className={cn("size-1.5 rounded-full", STATUS_META[t.status].dot)} aria-hidden />}
              {STATUS_META[t.status].label}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function ConversationSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading conversations">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-4 border-b border-line-soft px-5 py-4">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
