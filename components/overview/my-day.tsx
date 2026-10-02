"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AtIcon, CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { ErrorState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { SecondaryButton } from "@/components/shared/desk-ui";
import { slaClockText } from "@/components/tickets/ticket-sla-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { useNow } from "@/hooks/use-now";
import { useOverview } from "@/hooks/use-tickets";
import type { Overview } from "@/lib/api/tickets";
import { focusClock } from "@/lib/sla";
import { PRIORITY_META } from "@/lib/ticket-meta";
import { ticketListHref } from "@/lib/ticket-routes";
import type { TicketSummary } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

function greeting(hour: number) {
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** One number in the day's summary; links to the matching slice of My tickets. */
function Stat({ label, value, href, tone }: { label: string; value: number; href: string; tone?: "orange" | "red" }) {
  const hot = tone && value > 0;
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-col gap-1 rounded-xl border border-line-soft bg-card px-4 py-3 shadow-card transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
    >
      <span className="truncate text-[13px] text-ink-muted">{label}</span>
      <span className={cn("text-[24px] leading-8 font-semibold tabular-nums", hot ? (tone === "red" ? "text-[#DC2626]" : "text-[#EA580C]") : "text-ink")}>{value}</span>
    </Link>
  );
}

function Panel({ title, count, children, action }: { title: string; count?: number; children: ReactNode; action?: ReactNode }) {
  return (
    <section aria-label={title} className="min-w-0 overflow-hidden rounded-2xl border border-line-soft bg-card shadow-card">
      <header className="flex items-center gap-2 border-b border-line-soft px-5 py-3.5">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {count !== undefined && <span className="rounded-md bg-desk-depth-10 px-1.5 text-[12px] leading-5 font-semibold text-ink-body">{count}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </header>
      {children}
    </section>
  );
}

const REASON = {
  breached: { label: "Overdue", cls: "bg-[#FEF2F2] text-[#DC2626]" },
  at_risk: { label: "SLA at risk", cls: "bg-[#FFF1E6] text-[#EA580C]" },
  reply: { label: "Needs reply", cls: "bg-desk-10 text-desk" },
} as const;

function AttentionRow({ ticket, now }: { ticket: TicketSummary; now: number }) {
  const clock = focusClock(ticket.sla);
  const reason = clock.state === "breached" ? REASON.breached : clock.state === "at_risk" ? REASON.at_risk : REASON.reply;
  return (
    <li>
      <Link
        href={`/tickets/${ticket.id}`}
        className="flex items-center gap-3 border-b border-line-soft px-5 py-3 transition-colors last:border-0 hover:bg-desk-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-desk-action"
      >
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_META[ticket.priority].color }} title={`${PRIORITY_META[ticket.priority].label} priority`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">{ticket.subject}</span>
          <span className="block truncate text-[12px] text-ink-muted">
            #{ticket.ticketNumber} · {ticket.contact.name}, {ticket.customer.name}
          </span>
        </span>
        <span className="hidden shrink-0 text-[12px] whitespace-nowrap text-ink-body sm:block">
          {clock.label} · {slaClockText(clock.state, clock.due, now)}
        </span>
        <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[12px] font-medium whitespace-nowrap", reason.cls)}>{reason.label}</span>
      </Link>
    </li>
  );
}

function MentionRow({ item }: { item: Overview["mentions"][number] }) {
  const { ticket, message } = item;
  return (
    <li>
      <Link
        href={`/tickets/${ticket.id}`}
        className="flex gap-3 border-b border-line-soft px-5 py-3 transition-colors last:border-0 hover:bg-desk-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-desk-action"
      >
        <PersonAvatar name={message.author.name} src={message.author.avatar} size="md" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[13px] font-semibold text-ink">{message.author.name}</span>
            <TimeLabel iso={message.timestamp} className="shrink-0 text-[12px] text-ink-muted" />
          </span>
          <span className="block truncate text-[12px] text-ink-muted">
            {message.visibility === "internal" ? "Internal note" : "Reply"} on #{ticket.ticketNumber} · {ticket.subject}
          </span>
          <span className="mt-1 line-clamp-2 text-[13px] text-ink-body">{message.body}</span>
        </span>
      </Link>
    </li>
  );
}

function Empty({ icon: IconCmp, text }: { icon: typeof AtIcon; text: string }) {
  return (
    <p className="flex items-center gap-2 px-5 py-6 text-[13px] text-ink-muted">
      <IconCmp size={16} aria-hidden className="shrink-0" />
      {text}
    </p>
  );
}

function MyDaySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your day" className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

/** Overview: the signed-in agent's day — how much is on their plate, what to do next, who needs them. */
export function MyDay() {
  const { data, isPending, isError, refetch } = useOverview();
  const hydrated = useHydrated();
  const now = useNow();

  if (!hydrated || isPending) return <MyDaySkeleton />;
  if (isError) {
    return (
      <ErrorState
        title="Unable to load your day"
        hint="Your queues are still available from the sidebar. Try loading the overview again."
        action={<SecondaryButton onClick={() => refetch()}>Try again</SecondaryButton>}
      />
    );
  }

  const { agent, counts, attention, mentions } = data;
  const mine = (patch: Parameters<typeof ticketListHref>[0] = {}) => ticketListHref({ view: "mine", ...patch });
  const date = new Date(now).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] leading-8 font-semibold tracking-tight text-ink">
          {greeting(new Date(now).getHours())}, {agent.name.split(" ")[0]}
        </h1>
        <p className="text-[13px] text-ink-muted">{date} · Here&apos;s what needs you today.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Stat label="My open tickets" value={counts.mine} href={mine()} />
        <Stat label="Needs your reply" value={counts.needsReply} href={mine({ status: ["open"] })} />
        <Stat label="Waiting on customer" value={counts.waiting} href={mine({ status: ["pending"] })} />
        <Stat label="SLA at risk" value={counts.atRisk} href={mine({ sla: ["at_risk"] })} tone="orange" />
        <Stat label="Overdue" value={counts.overdue} href={mine({ sla: ["breached"] })} tone="red" />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel
          title="Needs your attention"
          count={attention.length}
          action={
            <Link href={mine({ sort: "sla_asc" })} className="text-[13px] font-semibold text-desk hover:underline">
              View all
            </Link>
          }
        >
          {attention.length ? (
            <ul>
              {attention.map((t) => (
                <AttentionRow key={t.id} ticket={t} now={now} />
              ))}
            </ul>
          ) : (
            <Empty icon={CheckCircleIcon} text="You're all caught up — nothing is overdue, at risk or waiting on your reply." />
          )}
        </Panel>

        <Panel title="Mentions" count={mentions.length}>
          {mentions.length ? (
            <ul>
              {mentions.map((m) => (
                <MentionRow key={m.message.id} item={m} />
              ))}
            </ul>
          ) : (
            <Empty icon={AtIcon} text="No one has mentioned you recently." />
          )}
        </Panel>
      </div>
    </div>
  );
}
