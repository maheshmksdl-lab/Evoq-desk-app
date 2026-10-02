"use client";

import { useState, type ReactNode } from "react";
import { CheckIcon, FadersHorizontalIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { DrawerActions, DrawerSection, SideDrawer } from "@/components/shared/desk-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { useLookups } from "@/hooks/use-tickets";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Lookups } from "@/lib/api/tickets";
import {
  countActiveFilters,
  DATE_RANGES,
  EMPTY_FILTERS,
  SLA_FILTER_STATES,
  TICKET_SORTS,
  type DateRange,
  type FilterKey,
  type TicketFilters,
  type TicketSort,
} from "@/lib/schemas/ticket";
import { CATEGORY_LABEL, PRIORITY_META, SLA_META, SOURCE_LABEL, STATUS_META, TYPE_LABEL } from "@/lib/ticket-meta";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_SOURCES, TICKET_STATUSES, TICKET_TYPES } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { SOURCE_ICON } from "./ticket-source-badge";

const DATE_LABEL: Record<DateRange, string> = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };

export const SORT_LABEL: Record<TicketSort, string> = {
  updated_desc: "Last updated",
  updated_asc: "Least recently updated",
  created_desc: "Newest first",
  created_asc: "Oldest first",
  priority_desc: "Priority (highest first)",
  sla_asc: "SLA due soonest",
};

type ListKey = Exclude<FilterKey, "created" | "updated">;

export const KEY_LABEL: Record<FilterKey, string> = {
  status: "Status",
  priority: "Priority",
  sla: "SLA",
  assignee: "Assignee",
  team: "Team",
  type: "Type",
  category: "Category",
  customer: "Customer",
  source: "Source",
  created: "Created",
  updated: "Updated",
  tags: "Tags",
};

/** Human label for one filter value — shared by the drawer, filter bar and chips. */
export function valueLabel(key: FilterKey, value: string, lookups?: Lookups): string {
  switch (key) {
    case "status":
      return STATUS_META[value as keyof typeof STATUS_META].label;
    case "priority":
      return PRIORITY_META[value as keyof typeof PRIORITY_META].label;
    case "type":
      return TYPE_LABEL[value as keyof typeof TYPE_LABEL];
    case "category":
      return CATEGORY_LABEL[value as keyof typeof CATEGORY_LABEL];
    case "source":
      return SOURCE_LABEL[value as keyof typeof SOURCE_LABEL];
    case "sla":
      return SLA_META[value as keyof typeof SLA_META].label;
    case "assignee":
      return value === "unassigned" ? "Unassigned" : (lookups?.agents.find((a) => a.id === value)?.name ?? value);
    case "team":
      return lookups?.teams.find((t) => t.id === value)?.name ?? value;
    case "customer":
      return lookups?.customers.find((c) => c.id === value)?.name ?? value;
    case "tags":
      return value;
    case "created":
    case "updated":
      return DATE_LABEL[value as DateRange];
  }
}

// ── Filter drawer ────────────────────────────────────────────────────

/** "More filters" sliders button for the list toolbar + the full filter drawer. */
export function TicketFiltersButton({
  filters,
  sort,
  onApply,
}: {
  filters: TicketFilters;
  sort: TicketSort;
  onApply: (f: TicketFilters, sort: TicketSort) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TicketFilters>(filters);
  const [draftSort, setDraftSort] = useState<TicketSort>(sort);
  const desktop = useMediaQuery("(min-width: 640px)");
  const { data: lookups } = useLookups();
  const active = countActiveFilters(filters);
  const draftCount = countActiveFilters(draft);

  const toggle = (key: ListKey, value: string) =>
    setDraft((d) => {
      const list = d[key] as string[];
      return { ...d, [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] };
    });

  const listSection = (key: ListKey, options: { value: string; label: ReactNode }[]) => (
    <DrawerSection title={KEY_LABEL[key]}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.value} selected={(draft[key] as string[]).includes(o.value)} onClick={() => toggle(key, o.value)}>
            {o.label}
          </Chip>
        ))}
      </div>
    </DrawerSection>
  );

  const dateSection = (key: "created" | "updated") => (
    <DrawerSection title={KEY_LABEL[key]}>
      <div className="flex flex-wrap gap-2">
        <Chip selected={!draft[key]} onClick={() => setDraft((d) => ({ ...d, [key]: undefined }))}>
          Any time
        </Chip>
        {DATE_RANGES.map((r) => (
          <Chip key={r} selected={draft[key] === r} onClick={() => setDraft((d) => ({ ...d, [key]: r }))}>
            {DATE_LABEL[r]}
          </Chip>
        ))}
      </div>
    </DrawerSection>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(filters);
          setDraftSort(sort);
          setOpen(true);
        }}
        aria-label={active ? `More filters and sorting, ${active} filters active` : "More filters and sorting"}
        className={cn(
          "relative inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2 text-[13px] font-medium transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action",
          active ? "border-desk/40 bg-desk-tint text-desk" : "border-line bg-card text-ink-body",
        )}
      >
        <FadersHorizontalIcon size={16} aria-hidden />
        <span className="sm:sr-only">More</span>
        {active > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-desk px-1 text-[10px] font-bold text-white">
            {active}
          </span>
        )}
      </button>

      <SideDrawer
        open={open}
        onOpenChange={setOpen}
        side={desktop ? "right" : "bottom"}
        width={440}
        icon={FadersHorizontalIcon}
        title="Filter tickets"
        subtitle="Combine filters to narrow the current view"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDraft(EMPTY_FILTERS)}
              disabled={!draftCount}
              className="mr-auto h-10 rounded-[9px] px-3 text-button font-semibold text-desk transition-colors hover:bg-white disabled:text-ink-faint"
            >
              Clear all
            </button>
            <DrawerActions
              onCancel={() => setOpen(false)}
              submitLabel={draftCount ? `Apply filters (${draftCount})` : "Apply"}
              onSubmit={() => {
                onApply(draft, draftSort);
                setOpen(false);
              }}
            />
          </>
        }
      >
        <DrawerSection title="Sort by">
          <div className="flex flex-wrap gap-2">
            {TICKET_SORTS.map((s) => (
              <Chip key={s} selected={draftSort === s} onClick={() => setDraftSort(s)}>
                {SORT_LABEL[s]}
              </Chip>
            ))}
          </div>
        </DrawerSection>
        {listSection(
          "status",
          TICKET_STATUSES.map((s) => ({ value: s, label: <><span className={cn("size-2 rounded-full", STATUS_META[s].dot)} aria-hidden />{STATUS_META[s].label}</> })),
        )}
        {listSection("priority", [...TICKET_PRIORITIES].reverse().map((p) => ({ value: p, label: PRIORITY_META[p].label })))}
        {listSection("sla", SLA_FILTER_STATES.map((s) => ({ value: s, label: SLA_META[s].label })))}
        {listSection("assignee", [
          ...(lookups?.agents ?? []).map((a) => ({
            value: a.id,
            label: <><PersonAvatar name={a.name} src={a.avatar} size="xs" />{a.id === lookups?.currentAgentId ? `${a.name} (me)` : a.name}</>,
          })),
          { value: "unassigned", label: <><PersonAvatar name={null} size="xs" />Unassigned</> },
        ])}
        {listSection("team", (lookups?.teams ?? []).map((t) => ({ value: t.id, label: t.name })))}
        {listSection("type", TICKET_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] })))}
        {listSection("category", TICKET_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] })))}
        {listSection("customer", (lookups?.customers ?? []).map((c) => ({ value: c.id, label: c.name })))}
        {listSection("tags", (lookups?.tags ?? []).map((t) => ({ value: t, label: t })))}
        {listSection(
          "source",
          TICKET_SOURCES.map((s) => {
            const IconCmp = SOURCE_ICON[s];
            return { value: s, label: <><IconCmp size={14} aria-hidden />{SOURCE_LABEL[s]}</> };
          }),
        )}
        {dateSection("created")}
        {dateSection("updated")}
      </SideDrawer>
    </>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-[10px] border-[1.5px] px-3 text-[0.84rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-desk-action",
        selected ? "border-desk bg-desk-tint font-medium text-ink" : "border-line bg-white text-ink-body hover:border-desk",
      )}
    >
      {selected && <CheckIcon size={12} weight="bold" aria-hidden className="text-desk" />}
      {children}
    </button>
  );
}

// ── Active filter chips ──────────────────────────────────────────────

/** Chips for filters that aren't already visible as dropdowns in the filter bar. */
export function ActiveFilterChips({
  filters,
  hidden = [],
  onChange,
  onClear,
}: {
  filters: TicketFilters;
  hidden?: FilterKey[];
  onChange: (f: TicketFilters) => void;
  onClear: () => void;
}) {
  const { data: lookups } = useLookups();
  const entries = (Object.keys(KEY_LABEL) as FilterKey[]).filter((k) => {
    if (hidden.includes(k)) return false;
    const v = filters[k];
    return Array.isArray(v) ? v.length > 0 : !!v;
  });
  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-5" aria-label="Active filters">
      {entries.map((key) => {
        const raw = filters[key];
        const values = Array.isArray(raw) ? raw : [raw as string];
        const text = values.map((v) => valueLabel(key, v, lookups)).join(", ");
        return (
          <span key={key} className="inline-flex h-7 max-w-full items-center gap-1 rounded-lg bg-desk-10 pr-1 pl-2.5 text-caption text-ink">
            <span className="text-ink-muted">{KEY_LABEL[key]}:</span>
            <span className="truncate font-medium">{text}</span>
            <button
              type="button"
              onClick={() => onChange({ ...filters, [key]: Array.isArray(raw) ? [] : undefined })}
              aria-label={`Remove ${KEY_LABEL[key]} filter`}
              className="inline-flex size-5 items-center justify-center rounded-md text-ink-muted hover:bg-white hover:text-ink"
            >
              <XIcon size={12} aria-hidden />
            </button>
          </span>
        );
      })}
      <button type="button" onClick={onClear} className="ml-1 text-button-sm font-semibold text-desk hover:underline">
        Clear all
      </button>
    </div>
  );
}
