import { Suspense } from "react";
import type { Metadata } from "next";
import { TicketList } from "@/components/tickets/ticket-list";
import { TicketTableSkeleton } from "@/components/tickets/ticket-table";

export const metadata: Metadata = { title: "Tickets" };

export default function TicketsPage() {
  return (
    // The list reads its state from the URL, so it renders on the client inside Suspense.
    <Suspense
      fallback={
        <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="h-[120px]" />
          <div className="rounded-2xl border border-line-soft bg-card p-4 shadow-card">
            <TicketTableSkeleton />
          </div>
        </div>
      }
    >
      <TicketList />
    </Suspense>
  );
}
