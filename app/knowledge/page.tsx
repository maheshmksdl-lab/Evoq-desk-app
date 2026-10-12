import { Suspense } from "react";
import type { Metadata } from "next";
import { ListSkeleton } from "@/components/customers/customers-view";
import { KnowledgeView } from "@/components/knowledge/knowledge-view";
import { PageShell } from "@/components/shared/desk-ui";

export const metadata: Metadata = { title: "Knowledge" };

export default function KnowledgePage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <ListSkeleton />
        </PageShell>
      }
    >
      <KnowledgeView />
    </Suspense>
  );
}
