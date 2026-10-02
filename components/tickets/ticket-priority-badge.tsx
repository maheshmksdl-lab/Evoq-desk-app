import { FlagIcon } from "@phosphor-icons/react/dist/ssr";
import { PRIORITY_META } from "@/lib/ticket-meta";
import type { TicketPriority } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

/**
 * Priority, compact — filled flag + coloured label (ServiceOps PriorityTag).
 * Urgent carries the stronger treatment: bold label in a tinted pill.
 */
export function TicketPriorityBadge({ priority, className }: { priority: TicketPriority; className?: string }) {
  const meta = PRIORITY_META[priority];
  if (priority === "urgent") {
    return (
      <span
        className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-table-cell font-semibold whitespace-nowrap", className)}
        style={{ color: meta.color, backgroundColor: meta.bg }}
      >
        <FlagIcon size={14} weight="fill" aria-hidden />
        {meta.label}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-table-cell whitespace-nowrap", className)} style={{ color: meta.color }}>
      <FlagIcon size={14} weight="fill" aria-hidden />
      {meta.label}
    </span>
  );
}
