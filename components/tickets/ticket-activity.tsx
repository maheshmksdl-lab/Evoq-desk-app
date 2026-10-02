"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
import { DetailCard, Timeline } from "@/components/shared/desk-ui";
import { useNow } from "@/hooks/use-now";
import { formatTimestamp } from "@/lib/format";
import type { TicketActivity as Activity } from "@/lib/types/ticket";

/** Chronological audit trail (ServiceOps History timeline). */
export function TicketActivity({ activities }: { activities: Activity[] }) {
  const now = useNow();
  return (
    <DetailCard icon={ClockCounterClockwiseIcon} title="History">
      <Timeline
        items={activities.map((a) => ({
          key: a.id,
          at: <time dateTime={a.timestamp}>{formatTimestamp(a.timestamp, now)}</time>,
          label: a.description,
          meta: a.actor,
        }))}
      />
    </DetailCard>
  );
}
