import { Suspense } from "react";
import type { Metadata } from "next";
import { CustomerDetail } from "@/components/customers/customer-detail";
import { CUSTOMERS } from "@/lib/mock-data/customers";

export async function generateMetadata({ params }: PageProps<"/customers/[customerId]">): Promise<Metadata> {
  const { customerId } = await params;
  return { title: CUSTOMERS.find((c) => c.id === customerId)?.name ?? "Customer" };
}

export default async function CustomerPage({ params }: PageProps<"/customers/[customerId]">) {
  const { customerId } = await params;
  return (
    <Suspense>
      <CustomerDetail customerId={decodeURIComponent(customerId)} />
    </Suspense>
  );
}
