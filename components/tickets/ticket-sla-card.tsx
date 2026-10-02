"use client";

import { TimerIcon } from "@phosphor-icons/react/dist/ssr";
import { DetailCard, Pill, type PillTone } from "@/components/shared/desk-ui";
import { useNow } from "@/hooks/use-now";
import { formatDuration, formatFullDate, formatTimestamp } from "@/lib/format";
import { SLA_META } from "@/lib/ticket-meta";
import type { SlaState, TicketSlaView, TicketStatus } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

const STATE_TONE: Record<SlaState, PillTone> = { on_track: "teal", at_risk: "amber", breached: "red", met: "green", paused: "gray" };

function describe(state: SlaState, due: string, doneAt: string | null, status: TicketStatus, now: number) {
  const diff = Date.parse(due) - now;
  switch (state) {
    case "met":
      return `Met ${formatTimestamp(doneAt!, now)}`;
    case "paused":
      return `Paused while ${status === "pending" ? "waiting on customer" : "on hold"}`;
    case "breached":
      return doneAt ? `Missed by ${formatDuration(Date.parse(doneAt) - Date.parse(due))}` : `Overdue by ${formatDuration(diff)}`;
    default:
      return `Due in ${formatDuration(diff)}`;
  }
}

/** Both SLA clocks — state pill, countdown and target time. */
export function TicketSlaCard({ sla, status }: { sla: TicketSlaView; status: TicketStatus }) {
  const now = useNow();
  const clocks = [
    { label: "First response", state: sla.firstResponseStatus, due: sla.firstResponseDue, done: sla.firstRespondedAt },
    { label: "Resolution", state: sla.resolutionStatus, due: sla.resolutionDue, done: sla.resolvedAt },
  ];
  return (
    <DetailCard icon={TimerIcon} title="SLA">
      <ul className="divide-y divide-line-soft">
        {clocks.map((c) => (
          <li key={c.label} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-body text-ink-muted">{c.label}</span>
              <Pill tone={STATE_TONE[c.state]}>{SLA_META[c.state].label}</Pill>
            </div>
            <p className={cn("mt-1 text-[15px] font-semibold", c.state === "at_risk" ? "text-[#D97706]" : c.state === "breached" ? "text-[#EF4444]" : "text-ink")}>
              {describe(c.state, c.due, c.done, status, now)}
            </p>
            <p className="text-caption text-ink-muted" title={formatFullDate(c.due)}>
              Target {formatTimestamp(c.due, now)}
            </p>
          </li>
        ))}
      </ul>
    </DetailCard>
  );
}
