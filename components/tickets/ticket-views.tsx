"use client";

import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ViewCounts } from "@/lib/api/tickets";
import type { TicketView } from "@/lib/schemas/ticket";
import { cn } from "@/lib/utils";
import { VIEW_META } from "./ticket-views-config";

const VIEW_GROUPS: { label: string; views: TicketView[] }[] = [
  { label: "Queues", views: ["all", "mine", "unassigned", "team", "recent"] },
  { label: "Needs attention", views: ["high_priority", "sla_at_risk", "overdue"] },
  { label: "By status", views: ["open", "pending", "on_hold", "resolved", "closed"] },
];

/** List title — the current view's name and count, doubling as the view switcher ("My tickets 12 ⌄"). */
export function TicketViewSwitcher({ active, counts, onSelect }: { active: TicketView; counts?: ViewCounts; onSelect: (v: TicketView) => void }) {
  const meta = VIEW_META[active];
  return (
    <div className="min-w-0">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Current view: ${meta.label}. Change view`}
          className="-ml-1.5 flex max-w-full items-center gap-2 rounded-lg px-1.5 py-0.5 text-left transition-colors hover:bg-desk-depth-10 focus-visible:outline-2 focus-visible:outline-desk-action data-[state=open]:bg-desk-depth-10"
        >
          <h1 className="truncate text-[20px] leading-7 font-semibold tracking-tight text-ink">{meta.label}</h1>
          {counts && <span className="rounded-md bg-desk-depth-10 px-1.5 text-[12px] leading-5 font-semibold text-ink-body">{counts[active]}</span>}
          <CaretDownIcon size={14} weight="bold" aria-hidden className="shrink-0 text-ink-muted" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px] rounded-xl">
          {VIEW_GROUPS.map((g, gi) => (
            <div key={g.label}>
              {gi > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-nav-group-label text-ink-muted uppercase">{g.label}</DropdownMenuLabel>
              {g.views.map((v) => {
                const ViewIcon = VIEW_META[v].icon;
                return (
                  <DropdownMenuItem key={v} onSelect={() => onSelect(v)} className={cn("rounded-lg", v === active && "bg-desk-tint")}>
                    <ViewIcon size={16} aria-hidden className={v === active ? "text-desk" : "text-ink-muted"} />
                    <span className="flex-1">{VIEW_META[v].label}</span>
                    {counts && <span className="text-caption text-ink-muted">{counts[v]}</span>}
                    {v === active && <CheckIcon size={14} aria-hidden className="text-desk" />}
                  </DropdownMenuItem>
                );
              })}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="mt-0.5 truncate text-[13px] text-ink-muted">{meta.description}</p>
    </div>
  );
}
