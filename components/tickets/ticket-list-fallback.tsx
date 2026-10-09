import { TicketTableSkeleton } from "./ticket-table";

/** Placeholder while the URL-driven ticket list hydrates — same frame as the real panel. */
export function TicketListFallback() {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-line-soft bg-card shadow-card">
        <div className="h-[112px]" />
        <TicketTableSkeleton />
      </div>
    </div>
  );
}
