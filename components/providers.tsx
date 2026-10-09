"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ActionsProvider } from "@/components/layout/actions-context";
import { NewTicketProvider } from "@/components/tickets/new-ticket-dialog";
import { useRemoteChangeSync } from "@/hooks/use-presence";

/** Refetches tickets that other agents change (presence channel events). */
function RemoteChangeSync() {
  useRemoteChangeSync();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={300}>
        <RemoteChangeSync />
        <ActionsProvider>
          <NewTicketProvider>{children}</NewTicketProvider>
        </ActionsProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "!rounded-[10px] !border-0 !bg-desk-depth !font-semibold !text-white !shadow-pop",
              description: "!font-normal !text-white/80",
              icon: "!text-desk-hover",
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
