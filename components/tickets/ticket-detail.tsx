"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LinkSimpleIcon, PaperclipIcon, TagIcon, TicketIcon } from "@phosphor-icons/react/dist/ssr";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailCard, DetailTabs, PageShell, SecondaryButton, DetailPrimaryButton } from "@/components/shared/desk-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { useRegisterAction } from "@/components/layout/actions-context";
import { useHydrated } from "@/hooks/use-hydrated";
import { useTicket } from "@/hooks/use-ticket";
import type { Ticket } from "@/lib/types/ticket";
import { AttachmentList } from "./attachment-list";
import { RelatedTickets } from "./related-tickets";
import { TicketActivity } from "./ticket-activity";
import type { ComposerMode } from "./ticket-composer";
import { TicketConversation } from "./ticket-conversation";
import { TicketCustomerPanel } from "./ticket-customer-panel";
import { TicketHeaderActions, TicketIdentity } from "./ticket-header";
import { TicketMeta } from "./ticket-meta";
import { TicketNextAction } from "./ticket-next-action";
import { TicketSlaCard } from "./ticket-sla-card";
import { TicketSpamNotice } from "./ticket-spam-notice";
import { TicketCollaboration } from "./ticket-presence";
import { TicketTags } from "./ticket-tags";

type Tab = "conversation" | "activity" | "attachments";

/**
 * Agent workspace for one ticket, in the ServiceOps detail layout:
 * breadcrumb + identity line, tabs with actions, next-step strip, then the
 * conversation beside the context cards (stacked below on smaller screens).
 */
export function TicketDetail({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const { data: ticket, isPending, isError, refetch } = useTicket(ticketId);
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>("conversation");
  const [composerMode, setComposerMode] = useState<ComposerMode>("public");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerAnchorRef = useRef<HTMLDivElement>(null);

  const openComposer = useCallback((mode: ComposerMode) => {
    setTab("conversation");
    setComposerMode(mode);
    // Wait a frame so the conversation tab is mounted before scrolling to the composer.
    requestAnimationFrame(() => {
      composerAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 250);
    });
  }, []);

  // R / N (and the command menu) — only once the ticket has loaded.
  const loaded = !!ticket;
  useRegisterAction("reply", () => openComposer("public"), loaded);
  useRegisterAction("internal-note", () => openComposer("internal"), loaded);

  if (!hydrated || isPending) return <TicketDetailSkeleton />;
  if (isError) {
    return (
      <PageShell>
        <ErrorState
          title="Unable to load ticket"
          hint="We couldn't open this ticket right now. Please try again."
          action={
            <div className="flex gap-3">
              <SecondaryButton onClick={() => router.push("/tickets")}>Back to tickets</SecondaryButton>
              <DetailPrimaryButton onClick={() => refetch()}>Try again</DetailPrimaryButton>
            </div>
          }
        />
      </PageShell>
    );
  }
  if (!ticket) {
    return (
      <PageShell>
        <EmptyState
          icon={TicketIcon}
          title="Ticket not found"
          hint={`We couldn't find a ticket with ID “${ticketId}”. It may have been deleted, or the link may be incorrect.`}
          action={<DetailPrimaryButton onClick={() => router.push("/tickets")}>Back to tickets</DetailPrimaryButton>}
        />
      </PageShell>
    );
  }

  const tabs = [
    { key: "conversation" as const, label: "Conversation", count: ticket.messages.length },
    { key: "activity" as const, label: "Activity", count: ticket.activities.length },
    { key: "attachments" as const, label: "Attachments", count: ticket.attachments.length },
  ];

  return (
    <PageShell>
      <TicketIdentity ticket={ticket} />
      <TicketCollaboration ticket={ticket} className="-mt-2" />
      <DetailTabs label="Ticket sections" tabs={tabs} active={tab} onChange={setTab} actions={<TicketHeaderActions ticket={ticket} onReply={() => openComposer("public")} />} />

      {tab === "conversation" && (
        <>
          {ticket.spam ? <TicketSpamNotice ticket={ticket} /> : <TicketNextAction ticket={ticket} onReply={() => openComposer("public")} />}
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
            <TicketConversation
              ticket={ticket}
              composerMode={composerMode}
              onComposerModeChange={setComposerMode}
              textareaRef={textareaRef}
              composerAnchorRef={composerAnchorRef}
              onAddNote={() => openComposer("internal")}
            />
            <ContextCards ticket={ticket} />
          </div>
        </>
      )}

      {tab === "activity" && (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <TicketActivity activities={ticket.activities} />
          <TicketSlaCard sla={ticket.sla} status={ticket.status} />
        </div>
      )}

      {tab === "attachments" && (
        <DetailCard icon={PaperclipIcon} title="Attachments">
          {ticket.attachments.length ? (
            <AttachmentList attachments={ticket.attachments} />
          ) : (
            <EmptyState icon={PaperclipIcon} title="No files on this ticket" hint="Files shared in the conversation appear here." className="py-8" />
          )}
        </DetailCard>
      )}
    </PageShell>
  );
}

/** Right column — SLA, ticket details, customer, tags, related tickets. */
function ContextCards({ ticket }: { ticket: Ticket }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
      <TicketSlaCard sla={ticket.sla} status={ticket.status} />
      <TicketMeta ticket={ticket} />
      <TicketCustomerPanel context={ticket.customerContext} />
      <DetailCard icon={TagIcon} title="Tags">
        <TicketTags ticketId={ticket.id} tags={ticket.tags} />
      </DetailCard>
      <DetailCard icon={LinkSimpleIcon} title="Related tickets">
        <RelatedTickets tickets={ticket.relatedTickets} empty="No related tickets linked." />
      </DetailCard>
    </div>
  );
}

export function TicketDetailSkeleton() {
  return (
    <PageShell>
      <div aria-busy="true" aria-label="Loading ticket" className="space-y-5">
        <Skeleton className="h-5 w-56" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-[min(520px,90%)]" />
          <Skeleton className="h-4 w-[min(420px,80%)]" />
        </div>
        <Skeleton className="h-12 w-full rounded-none" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <div className="space-y-3 rounded-2xl border border-line-soft p-5 shadow-card">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3 rounded-xl border border-line-soft p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
