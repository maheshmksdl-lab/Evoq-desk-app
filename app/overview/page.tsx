import type { Metadata } from "next";
import { MyDay } from "@/components/overview/my-day";
import { PageShell } from "@/components/shared/desk-ui";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <PageShell>
      <MyDay />
    </PageShell>
  );
}
