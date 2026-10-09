"use client";

import type { Icon } from "@phosphor-icons/react";
import { CheckCircleIcon, ClockIcon, PauseCircleIcon, TimerIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { formatDuration, formatFullDate } from "@/lib/format";
import { focusClock } from "@/lib/sla";
import { SLA_META } from "@/lib/ticket-meta";
import type { SlaState, TicketSlaView } from "@/lib/types/ticket";

export const SLA_ICON: Record<SlaState, Icon> = {
  on_track: TimerIcon,
  at_risk: TimerIcon,
  breached: WarningCircleIcon,
  met: CheckCircleIcon,
  paused: PauseCircleIcon,
};

/** Short text for a clock: "42m left", "2h 5m over", "Met", "Paused". */
export function slaClockText(state: SlaState, due: string, now = Date.now()) {
  const diff = Date.parse(due) - now;
  if (state === "met") return "Met";
  if (state === "paused") return "Paused";
  if (state === "breached") return diff < 0 ? `${formatDuration(diff)} over` : "Missed";
  return `${formatDuration(diff)} left`;
}

/** List-cell SLA: the clock that matters now, with state icon + text. */
export function TicketSlaIndicator({ sla, className }: { sla: TicketSlaView; className?: string }) {
  const now = useNow();
  const focus = focusClock(sla);
  const meta = SLA_META[focus.state];
  const IconCmp = SLA_ICON[focus.state];
  const quiet = focus.state === "met" || focus.state === "paused" || focus.state === "on_track";
  return (
    <span className={cn("inline-flex min-w-0 flex-col leading-tight", className)} title={`${focus.label} target: ${formatFullDate(focus.due)}`}>
      <span className={cn("inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap", meta.text)}>
        <IconCmp size={14} weight={quiet ? "regular" : "fill"} aria-hidden className="shrink-0" />
        {slaClockText(focus.state, focus.due, now)}
      </span>
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {focus.label}
        {focus.state === "at_risk" ? " · At risk" : <span className="sr-only"> · {meta.label}</span>}
      </span>
    </span>
  );
}

/** Time left on the running SLA clock, coloured by urgency. Nothing while the clock is stopped or paused. */
export function SlaLeft({ sla, now, className }: { sla: TicketSlaView; now: number; className?: string }) {
  const clock = focusClock(sla);
  if (clock.state === "met" || clock.state === "paused") return null;
  const left = Date.parse(clock.due) - now;
  const urgent = clock.state === "breached" || (clock.state === "at_risk" && left < 3_600_000);
  const IconCmp = clock.state === "breached" ? WarningCircleIcon : ClockIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[13px] leading-5 font-medium whitespace-nowrap",
        urgent ? "text-[#EF4444]" : clock.state === "at_risk" ? "text-[#F59E0B]" : "text-ink-muted",
        className,
      )}
      title={`${clock.label} target`}
    >
      <IconCmp size={16} weight="bold" aria-hidden className="shrink-0" />
      {slaClockText(clock.state, clock.due, now)}
    </span>
  );
}
