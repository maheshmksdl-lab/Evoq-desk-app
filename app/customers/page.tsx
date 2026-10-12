import { Suspense } from "react";
import type { Metadata } from "next";
import { CustomersView, ListSkeleton } from "@/components/customers/customers-view";
import { PageShell } from "@/components/shared/desk-ui";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    // Filters live in the URL, so the list renders on the client inside Suspense.
    <Suspense
      fallback={
        <PageShell>
          <ListSkeleton />
        </PageShell>
      }
    >
      <CustomersView />
    </Suspense>
  );
}
