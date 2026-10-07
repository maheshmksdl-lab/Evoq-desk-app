import type { Metadata } from "next";
import { OverviewDashboard } from "@/components/overview/overview-dashboard";
import { PageShell } from "@/components/shared/desk-ui";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <PageShell>
      <OverviewDashboard />
    </PageShell>
  );
}
