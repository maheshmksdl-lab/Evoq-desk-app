"use client";

import { KpiRow, KpiTile, type SelectOption, type Tone } from "@/components/shared/desk-ui";
import type { ViewCounts } from "@/lib/api/tickets";
import type { TicketView } from "@/lib/schemas/ticket";
import { VIEW_META } from "./ticket-views-config";

/** Views surfaced as KPI tiles — they double as quick filters, as on the ServiceOps lists. */
const KPI_VIEWS: { view: TicketView; label: string; tone: Tone }[] = [
  { view: "mine", label: "My tickets", tone: "purple" },
  { view: "unassigned", label: "Unassigned", tone: "gray" },
  { view: "open", label: "Open", tone: "desk" },
  { view: "pending", label: "Pending", tone: "amber" },
  { view: "sla_at_risk", label: "SLA at risk", tone: "orange" },
  { view: "overdue", label: "Overdue", tone: "red" },
];

export function TicketKpis({ active, counts, onSelect }: { active: TicketView; counts?: ViewCounts; onSelect: (v: TicketView) => void }) {
  return (
    <KpiRow>
      {KPI_VIEWS.map(({ view, label, tone }) => (
        <KpiTile
          key={view}
          label={label}
          value={counts ? counts[view] : "–"}
          tone={tone}
          icon={VIEW_META[view].icon}
          weight="duotone"
          active={active === view}
          onClick={() => onSelect(active === view ? "all" : view)}
        />
      ))}
    </KpiRow>
  );
}

/** Every predefined view for the "View" filter, grouped. */
export function viewOptions(counts?: ViewCounts): SelectOption[] {
  const opt = (view: TicketView, group: string): SelectOption => ({
    value: view,
    label: counts ? `${VIEW_META[view].label} (${counts[view]})` : VIEW_META[view].label,
    group,
  });
  return [
    opt("mine", "Queues"),
    opt("unassigned", "Queues"),
    opt("high_priority", "Needs attention"),
    opt("sla_at_risk", "Needs attention"),
    opt("overdue", "Needs attention"),
    opt("open", "By status"),
    opt("pending", "By status"),
    opt("on_hold", "By status"),
    opt("resolved", "By status"),
    opt("closed", "By status"),
  ];
}
