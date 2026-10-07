"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CaretRightIcon,
  ChatCenteredTextIcon,
  CheckCircleIcon,
  ClockIcon,
  DotsThreeIcon,
  FileTextIcon,
  LightbulbIcon,
  TrayIcon,
  UsersIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { ChannelDonut } from "@/components/overview/channel-donut";
import { IconTile, Pill, SecondaryButton, TONES, type PillTone, type Tone } from "@/components/shared/desk-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { ErrorState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { TicketBulkBar } from "@/components/tickets/ticket-bulk-bar";
import { slaClockText } from "@/components/tickets/ticket-sla-indicator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { useNow } from "@/hooks/use-now";
import { useOverview } from "@/hooks/use-tickets";
import { OVERVIEW_RANGES, type Overview, type OverviewRange, type TeamActivityItem, type Trend } from "@/lib/api/tickets";
import { formatDuration } from "@/lib/format";
import { focusClock } from "@/lib/sla";
import { PRIORITY_META } from "@/lib/ticket-meta";
import { ticketHref, ticketListHref, ticketViewHref } from "@/lib/ticket-routes";
import type { TicketPriority, TicketSummary } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

const GOOD = "text-[#16A34A]";
const BAD = "text-[#EF4444]";

function greeting(hour: number) {
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

const RANGE_LABEL: Record<OverviewRange, { menu: string; short: string; compare: string }> = {
  today: { menu: "Today", short: "Today", compare: "Compared to yesterday" },
  "7d": { menu: "Last 7 days", short: "7 days", compare: "Compared to previous 7 days" },
  "30d": { menu: "Last 30 days", short: "30 days", compare: "Compared to previous 30 days" },
};

// ── Building blocks ──────────────────────────────────────────────────

function Card({ title, children, className, label }: { title?: string; label?: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={label ?? title} className={cn("min-w-0 rounded-xl border border-line-soft bg-card shadow-card", className)}>
      {children}
    </section>
  );
}

function CardHeader({ title, count, action }: { title: string; count?: number; action?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 px-5 pt-5 pb-3">
      <h2 className="truncate text-h1 text-ink">{title}</h2>
      {count !== undefined && <span className="rounded-md bg-muted px-2 text-badge leading-6 font-semibold text-ink-body tabular-nums">{count}</span>}
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </header>
  );
}

function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded text-label font-normal text-ink-body transition-colors hover:text-desk focus-visible:outline-2 focus-visible:outline-desk-action"
    >
      {label}
      <ArrowRightIcon size={14} aria-hidden />
    </Link>
  );
}

/** "↓ 3 from yesterday" — green when the change is good, red when it isn't. */
function Delta({ trend, lowerIsBetter, children }: { trend: Trend; lowerIsBetter?: boolean; children: (diff: number) => ReactNode }) {
  if (trend.value === null || trend.previous === null) return <span className="text-ink-muted">No comparison</span>;
  const diff = trend.value - trend.previous;
  if (diff === 0) return <span className="text-ink-muted">No change</span>;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  const ArrowCmp = diff > 0 ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span className={cn("inline-flex items-center gap-1", good ? GOOD : BAD)}>
      <ArrowCmp size={14} weight="bold" aria-hidden />
      <span className="sr-only">{diff > 0 ? "Up" : "Down"}</span>
      {children(Math.abs(diff))}
    </span>
  );
}

// ── Queue cards ──────────────────────────────────────────────────────

function QueueCard({ label, trend, href, tone, icon: IconCmp }: { label: string; trend: Trend; href: string; tone: Tone; icon: Icon }) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-line-soft bg-card p-4 shadow-card transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action sm:p-5"
    >
      <span className="self-start">
        <IconTile tone={tone} size={48}>
          <IconCmp size={26} aria-hidden />
        </IconTile>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label font-normal text-ink-body 2xl:text-h2 2xl:font-normal">{label}</span>
        <span className="mt-1 block text-display font-bold text-ink tabular-nums">{trend.value}</span>
        <span className="mt-1 block text-body">
          <Delta trend={trend} lowerIsBetter>
            {(n) => <span className="text-ink-muted">{n} from yesterday</span>}
          </Delta>
        </span>
      </span>
      <CaretRightIcon size={18} aria-hidden className="shrink-0 text-ink-faint transition-colors group-hover:text-desk" />
    </Link>
  );
}

// ── Tickets that need attention ──────────────────────────────────────

/** The SLA cell: time left, coloured by urgency; tickets paused on the customer show "Waiting". */
function SlaCell({ ticket, now }: { ticket: TicketSummary; now: number }) {
  if (ticket.status === "pending") return <Pill tone="amber" dot={false} className="px-3.5 text-label">Waiting</Pill>;
  const clock = focusClock(ticket.sla);
  const left = Date.parse(clock.due) - now;
  const tone =
    clock.state === "breached" || (clock.state === "at_risk" && left < 3_600_000)
      ? BAD
      : clock.state === "at_risk"
        ? "text-[#F97316]"
        : "text-ink-muted";
  const IconCmp = clock.state === "breached" ? WarningCircleIcon : clock.state === "met" ? CheckCircleIcon : ClockIcon;
  return (
    <span className={cn("inline-flex items-center gap-2 text-table-cell whitespace-nowrap", tone)} title={`${clock.label} target`}>
      <IconCmp size={20} aria-hidden className="shrink-0" />
      {slaClockText(clock.state, clock.due, now)}
    </span>
  );
}

function RowMenu({ ticket }: { ticket: TicketSummary }) {
  const router = useRouter();
  const copy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${ticketHref(ticket.id)}`);
    toast.success(`Link to #${ticket.ticketNumber} copied`);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        aria-label={`Actions for #${ticket.ticketNumber}`}
        className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-desk-action data-[state=open]:bg-muted"
      >
        <DotsThreeIcon size={20} weight="bold" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="w-44 rounded-xl">
        <DropdownMenuItem onSelect={() => router.push(ticketHref(ticket.id, { view: "mine" }))}>Open ticket</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.open(ticketHref(ticket.id, { view: "mine" }), "_blank", "noopener")}>Open in new tab</DropdownMenuItem>
        <DropdownMenuItem onSelect={copy}>Copy link</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AttentionTable({ tickets, total, now }: { tickets: TicketSummary[]; total: number; now: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const picked = tickets.filter((t) => selected.has(t.id));
  const all = picked.length === tickets.length && tickets.length > 0;
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const th = "px-2.5 py-2.5 text-left text-table-header font-normal whitespace-nowrap text-ink-muted";

  return (
    <Card title="Your tickets that need attention">
      <CardHeader title="Your tickets that need attention" count={total} action={<ViewAll href={ticketListHref({ view: "mine", sort: "sla_asc" })} />} />
      {picked.length > 0 && (
        <div className="px-5 pb-3">
          <TicketBulkBar tickets={picked} onClear={() => setSelected(new Set())} />
        </div>
      )}
      {tickets.length ? (
        <div className="overflow-x-auto px-2 pb-3 scrollbar-thin">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={cn(th, "w-10 pl-3")}>
                  <Checkbox
                    checked={all ? true : picked.length ? "indeterminate" : false}
                    onCheckedChange={() => setSelected(all ? new Set() : new Set(tickets.map((t) => t.id)))}
                    aria-label="Select all tickets"
                    className="border-ink-faint bg-card"
                  />
                </th>
                <th className={th}>#</th>
                <th className={th}>Ticket</th>
                <th className={cn(th, "hidden md:table-cell")}>Customer</th>
                <th className={th}>SLA</th>
                <th className={cn(th, "hidden sm:table-cell")}>Updated</th>
                <th className={cn(th, "w-10")}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const on = selected.has(t.id);
                const td = cn(
                  "border-y border-transparent px-2.5 py-4.5 align-middle transition-colors first:rounded-l-lg first:border-l last:rounded-r-lg last:border-r",
                  "group-hover:border-desk-soft group-hover:bg-desk-surface",
                  on && "border-desk-soft bg-desk-tint",
                );
                return (
                  <tr key={t.id} onClick={() => router.push(ticketHref(t.id, { view: "mine" }))} className="group cursor-pointer">
                    <td className={cn(td, "pl-3")} onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={on} onCheckedChange={() => toggle(t.id)} aria-label={`Select ticket #${t.ticketNumber}`} className="border-ink-faint bg-card" />
                    </td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-2.5 text-table-cell-secondary whitespace-nowrap text-ink-muted">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_META[t.priority].color }} title={`${PRIORITY_META[t.priority].label} priority`}>
                          <span className="sr-only">{PRIORITY_META[t.priority].label} priority</span>
                        </span>
                        #{t.ticketNumber}
                      </span>
                    </td>
                    <td className={cn(td, "w-full max-w-0 min-w-44")}>
                      <Link
                        href={ticketHref(t.id, { view: "mine" })}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate text-table-cell font-semibold text-ink hover:text-desk focus-visible:outline-2 focus-visible:outline-desk-action"
                      >
                        {t.subject}
                      </Link>
                      <span className="block truncate text-table-cell-secondary text-ink-muted">{t.preview}</span>
                    </td>
                    <td className={cn(td, "hidden md:table-cell")}>
                      <span className="flex items-center gap-3">
                        <PersonAvatar name={t.contact.name} src={t.contact.avatar} size="lg" />
                        <span className="min-w-0">
                          <span className="block truncate text-table-cell text-ink">{t.contact.name}</span>
                          <span className="block truncate text-table-cell-secondary text-ink-muted">{t.customer.name}</span>
                        </span>
                      </span>
                    </td>
                    <td className={td}>
                      <SlaCell ticket={t} now={now} />
                    </td>
                    <td className={cn(td, "hidden whitespace-nowrap sm:table-cell")}>
                      <TimeLabel iso={t.updatedAt} className="text-table-cell text-ink-muted" />
                    </td>
                    <td className={cn(td, "pr-2 text-right")} onClick={(e) => e.stopPropagation()}>
                      <RowMenu ticket={t} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="flex items-center gap-2 px-5 pb-6 text-body text-ink-muted">
          <CheckCircleIcon size={16} aria-hidden className="shrink-0 text-desk" />
          You&apos;re all caught up — no open tickets are assigned to you.
        </p>
      )}
    </Card>
  );
}

// ── Team activity ────────────────────────────────────────────────────

const ACTIVITY_TONE: Record<TeamActivityItem["kind"], Tone> = {
  reply: "green",
  resolved: "desk",
  assigned: "blue",
  note: "orange",
  status: "purple",
  priority: "amber",
  tag: "gray",
};

function TeamActivity({ items }: { items: TeamActivityItem[] }) {
  return (
    <Card title="Team activity">
      <CardHeader title="Team activity" action={<ViewAll href={ticketViewHref("recent")} />} />
      {items.length ? (
        <ul className="px-5 pb-4">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-1.5">
              <PersonAvatar name={a.agent.name} src={a.agent.avatar} size="md" status={a.agent.status} />
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: TONES[ACTIVITY_TONE[a.kind]].fg }} aria-hidden />
              <p className="line-clamp-2 min-w-0 flex-1 text-body text-ink-muted">
                <span className="text-ink">{a.agent.name}</span> {a.action}{" "}
                <Link href={ticketHref(a.ticket.id)} className="text-ink hover:text-desk hover:underline focus-visible:outline-2 focus-visible:outline-desk-action">
                  #{a.ticket.ticketNumber}
                </Link>
              </p>
              <TimeLabel iso={a.timestamp} className="shrink-0 text-caption text-ink-muted" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 pb-6 text-body text-ink-muted">No team activity yet.</p>
      )}
    </Card>
  );
}

// ── Performance ──────────────────────────────────────────────────────

/** "↑ 12%" against the comparison window. */
function PercentDelta({ trend, lowerIsBetter }: { trend: Trend; lowerIsBetter?: boolean }) {
  if (trend.value === null || trend.previous === null || trend.previous === 0) {
    return <span className="text-ink-muted">{trend.value === trend.previous ? "No change" : "—"}</span>;
  }
  return (
    <Delta trend={trend} lowerIsBetter={lowerIsBetter}>
      {(n) => `${Math.round((n / trend.previous!) * 100)}%`}
    </Delta>
  );
}

function Performance({ data, range }: { data: Overview["performance"]; range: OverviewRange }) {
  const stats: { label: string; value: string; trend: Trend; lowerIsBetter?: boolean }[] = [
    { label: "Tickets received", value: String(data.received.value ?? 0), trend: data.received },
    { label: "Tickets resolved", value: String(data.resolved.value ?? 0), trend: data.resolved },
    {
      label: "First response",
      value: data.firstResponseMins.value === null ? "—" : formatDuration(data.firstResponseMins.value * 60_000),
      trend: data.firstResponseMins,
      lowerIsBetter: true,
    },
    { label: "SLA compliance", value: data.slaCompliance.value === null ? "—" : `${data.slaCompliance.value}%`, trend: data.slaCompliance },
  ];
  return (
    <Card title={range === "today" ? "Today's performance" : "Performance"}>
      <CardHeader
        title={range === "today" ? "Today's performance" : `Performance · ${RANGE_LABEL[range].menu}`}
        action={<span className="text-caption text-ink-muted">{RANGE_LABEL[range].compare}</span>}
      />
      <dl className="grid grid-cols-2 gap-x-3 gap-y-5 px-5 pt-2 pb-5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex min-w-0 flex-col">
            <dd className="order-1 text-h1 font-bold whitespace-nowrap text-ink tabular-nums">{s.value}</dd>
            <dt className="order-2 text-caption text-ink-muted">{s.label}</dt>
            <dd className="order-3 mt-1.5 text-caption font-semibold">
              <PercentDelta trend={s.trend} lowerIsBetter={s.lowerIsBetter} />
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

// ── Recent customer messages ─────────────────────────────────────────

const PRIORITY_PILL: Record<TicketPriority, PillTone> = { urgent: "red", high: "red", medium: "blue", low: "gray" };

function RecentMessages({ items }: { items: Overview["messages"] }) {
  return (
    <Card title="Recent customer messages">
      <CardHeader title="Recent customer messages" action={<ViewAll href={ticketViewHref("recent")} />} />
      {items.length ? (
        <ul className="px-2 pb-3">
          {items.map(({ ticket, message }) => (
            <li key={message.id}>
              <Link
                href={ticketHref(ticket.id)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-desk-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-desk-action"
              >
                <PersonAvatar name={message.author.name} src={message.author.avatar} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2 text-caption whitespace-nowrap text-ink-muted">
                    <span className="truncate text-label font-semibold text-ink">{message.author.name}</span>
                    <span>#{ticket.ticketNumber}</span>
                    <span aria-hidden>·</span>
                    <TimeLabel iso={message.timestamp} />
                  </span>
                  <span className="block truncate text-table-cell-secondary text-ink-muted">{message.body.replace(/\s+/g, " ")}</span>
                </span>
                <Pill tone={PRIORITY_PILL[ticket.priority]} dot={false} className="shrink-0 rounded-lg px-2.5">
                  {PRIORITY_META[ticket.priority].label}
                </Pill>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 pb-6 text-body text-ink-muted">No customer messages yet.</p>
      )}
    </Card>
  );
}

// ── Knowledge ────────────────────────────────────────────────────────

function KnowledgeArticles({ items }: { items: Overview["articles"] }) {
  const insert = async (a: Overview["articles"][number]) => {
    await navigator.clipboard.writeText(`${a.title}: ${a.url}`);
    toast.success("Article link copied", { description: `Paste “${a.title}” into your reply.` });
  };
  return (
    <Card title="Top knowledge articles">
      <CardHeader title="Top knowledge articles" />
      <ul className="divide-y divide-line-soft px-5 pb-2">
        {items.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3.5">
            <span className="self-start">
              <IconTile tone="blue" size={40}>
                <FileTextIcon size={22} aria-hidden />
              </IconTile>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-table-cell font-semibold text-ink">{a.title}</span>
              <span className="block truncate text-table-cell-secondary text-ink-muted">{a.summary}</span>
              <span className="mt-1 block text-table-cell-secondary text-ink-muted">Used {a.uses} times</span>
            </span>
            <button
              type="button"
              onClick={() => insert(a)}
              aria-label={`Insert ${a.title}`}
              className="h-8 shrink-0 rounded-lg border border-line bg-card px-3 text-button-sm text-ink-body transition-colors hover:border-desk hover:text-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
            >
              Insert
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ── Channels ─────────────────────────────────────────────────────────

function TicketsByChannel({ channels, breached, range, className }: { channels: Overview["channels"]; breached: number; range: OverviewRange; className?: string }) {
  return (
    <Card title="Tickets by channel" className={cn("flex flex-col", className)}>
      <CardHeader title="Tickets by channel" />
      <div className="flex-1 px-5 pt-1 pb-4">
        <ChannelDonut channels={channels} caption={RANGE_LABEL[range].short} />
      </div>
      <div className="px-4 pb-4">
        {breached ? (
          <Link
            href={ticketViewHref("overdue")}
            className="flex items-start gap-3 rounded-lg bg-[#FEF2F2] px-4 py-3 transition-colors hover:bg-[#FEE2E2] focus-visible:outline-2 focus-visible:outline-desk-action"
          >
            <WarningCircleIcon size={24} aria-hidden className="mt-0.5 shrink-0 text-[#DC2626]" />
            <span>
              <span className="block text-caption font-semibold text-ink">
                {breached} {breached === 1 ? "ticket has" : "tickets have"} breached SLA
              </span>
              <span className="block text-caption text-ink-muted">Review overdue tickets before they escalate.</span>
            </span>
          </Link>
        ) : (
          <div className="flex items-start gap-3 rounded-lg bg-desk-tint px-4 py-3">
            <LightbulbIcon size={24} aria-hidden className="mt-0.5 shrink-0 text-desk" />
            <span>
              <span className="block text-caption font-semibold text-ink">You&apos;re all caught up on previous SLA breaches</span>
              <span className="block text-caption text-ink-muted">Great work! There are no overdue tickets at the moment.</span>
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

function RangePicker({ range, onChange, now }: { range: OverviewRange; onChange: (r: OverviewRange) => void; now: number }) {
  const today = new Date(now).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const label = (r: OverviewRange) => (r === "today" ? `Today, ${today}` : RANGE_LABEL[r].menu);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Date range: ${label(range)}`}
        className="inline-flex h-11 items-center gap-3 rounded-lg border border-line bg-card px-4 text-label text-ink shadow-card transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action data-[state=open]:border-desk"
      >
        <CalendarBlankIcon size={20} aria-hidden className="text-ink-body" />
        {label(range)}
        <CaretDownIcon size={14} aria-hidden className="ml-4 text-ink-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <DropdownMenuRadioGroup value={range} onValueChange={(v) => onChange(v as OverviewRange)}>
          {OVERVIEW_RANGES.map((r) => (
            <DropdownMenuRadioItem key={r} value={r}>
              {label(r)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading overview" className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-5 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Skeleton className="h-[400px] rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-[248px] rounded-xl" />
          <Skeleton className="h-[136px] rounded-xl" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[280px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Overview: queue health, what the agent should work on next, and how the team's day is going. */
export function OverviewDashboard() {
  const [range, setRange] = useState<OverviewRange>("today");
  const { data, isPending, isError, refetch } = useOverview(range);
  const hydrated = useHydrated();
  const now = useNow();

  if (!hydrated || isPending) return <OverviewSkeleton />;
  if (isError) {
    return (
      <ErrorState
        title="Unable to load the overview"
        hint="Your queues are still available from the sidebar. Try loading the overview again."
        action={<SecondaryButton onClick={() => refetch()}>Try again</SecondaryButton>}
      />
    );
  }

  const { agent, queues } = data;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="text-display font-bold tracking-tight text-ink sm:text-[32px] sm:leading-10">
            {greeting(new Date(now).getHours())}, {agent.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-body text-ink-muted sm:text-h2 sm:font-normal">Here&apos;s what&apos;s happening with your support team today.</p>
        </div>
        <div className="shrink-0 self-start">
          <RangePicker range={range} onChange={setRange} now={now} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QueueCard label="My open tickets" trend={queues.mine} href={ticketViewHref("mine")} tone="desk" icon={TrayIcon} />
        <QueueCard label="Unassigned" trend={queues.unassigned} href={ticketViewHref("unassigned")} tone="red" icon={UsersIcon} />
        <QueueCard label="SLA at risk" trend={queues.atRisk} href={ticketViewHref("sla_at_risk")} tone="amber" icon={ClockIcon} />
        <QueueCard label="Waiting for customer" trend={queues.waiting} href={ticketViewHref("pending")} tone="blue" icon={ChatCenteredTextIcon} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <AttentionTable tickets={data.attention} total={data.attentionTotal} now={now} />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
          <TeamActivity items={data.activity} />
          <Performance data={data.performance} range={range} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1.12fr)_minmax(0,1fr)]">
        <RecentMessages items={data.messages} />
        <KnowledgeArticles items={data.articles} />
        <TicketsByChannel channels={data.channels} breached={data.breached} range={range} className="md:col-span-2 xl:col-span-1" />
      </div>
    </div>
  );
}
