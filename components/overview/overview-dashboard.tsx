"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  ChartBarIcon,
  ChatCircleIcon,
  ChatCircleTextIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
  NotePencilIcon,
  SealCheckIcon,
  TagIcon,
  TimerIcon,
  UserIcon,
  UsersIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { SecondaryButton, TONES, type Tone } from "@/components/shared/desk-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { ErrorState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { SOURCE_ICON } from "@/components/tickets/ticket-source-badge";
import { slaClockText } from "@/components/tickets/ticket-sla-indicator";
import {
  DropdownMenu,
  DropdownMenuContent,
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
import { PRIORITY_META, SOURCE_LABEL } from "@/lib/ticket-meta";
import { ticketHref, ticketViewHref } from "@/lib/ticket-routes";
import type { Agent, TicketPriority, TicketSource, TicketSummary } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

const GOOD = "text-[#16A34A]";
const BAD = "text-[#EF4444]";
const WARN = "text-[#F97316]";

const RANGE_LABEL: Record<OverviewRange, { menu: string; resolved: string }> = {
  today: { menu: "Today", resolved: "Resolved today" },
  "7d": { menu: "Last 7 days", resolved: "Resolved · 7 days" },
  "30d": { menu: "Last 30 days", resolved: "Resolved · 30 days" },
};

// ── Building blocks ──────────────────────────────────────────────────

function Card({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={label} className={cn("min-w-0 rounded-2xl border border-line-soft bg-card shadow-card", className)}>
      {children}
    </section>
  );
}

function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 px-5 pt-5 pb-2">
      <h2 className="truncate text-[17px] leading-6 font-semibold text-ink">{title}</h2>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </header>
  );
}

function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded text-[13px] leading-5 font-medium text-desk transition-colors hover:text-desk-press focus-visible:outline-2 focus-visible:outline-desk-action"
    >
      {label}
      <ArrowRightIcon size={14} weight="bold" aria-hidden />
    </Link>
  );
}

/** Round tinted icon disc used by the KPI and stat cards. */
function IconDisc({ tone, size, children }: { tone: Tone; size: number; children: ReactNode }) {
  const { fg, tint } = TONES[tone];
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, backgroundColor: tint, color: fg }}>
      {children}
    </span>
  );
}

// ── Queue strip ──────────────────────────────────────────────────────

function QueueTile({ label, value, href, tone, icon: IconCmp, valueClass }: { label: string; value: number | null; href: string; tone: Tone; icon: Icon; valueClass?: string }) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-line-soft px-3 py-3 sm:gap-3 sm:px-3.5 sm:py-3.5 transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
      style={{ backgroundImage: `linear-gradient(120deg, ${TONES[tone].tint} 0%, transparent 70%)` }}
    >
      <IconDisc tone={tone} size={40}>
        <IconCmp size={24} aria-hidden />
      </IconDisc>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[22px] leading-7 font-bold text-ink tabular-nums", valueClass)}>{value ?? "—"}</span>
        <span className="flex items-center gap-2.5 text-[13px] leading-5 text-ink-muted">
          <span className="truncate">{label}</span>
          <ArrowRightIcon size={14} aria-hidden className="hidden shrink-0 text-ink-body sm:block transition-colors group-hover:text-desk" />
        </span>
      </span>
    </Link>
  );
}

function QueueStrip({ queues }: { queues: Overview["queues"] }) {
  return (
    <section aria-label="Queues" className="rounded-2xl border border-line-soft bg-card p-3 shadow-card">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-5 [&>:last-child]:col-span-2 md:[&>:last-child]:col-span-1">
        <QueueTile label="All open" value={queues.allOpen.value} href={ticketViewHref("open")} tone="desk" icon={ChatCircleIcon} />
        <QueueTile label="My tickets" value={queues.mine.value} href={ticketViewHref("mine")} tone="blue" icon={UserIcon} />
        <QueueTile label="Unassigned" value={queues.unassigned.value} href={ticketViewHref("unassigned")} tone="gray" icon={UsersIcon} />
        <QueueTile label="SLA at risk" value={queues.atRisk.value} href={ticketViewHref("sla_at_risk")} tone="orange" icon={ClockIcon} valueClass={WARN} />
        <QueueTile label="Waiting for customer" value={queues.waiting.value} href={ticketViewHref("pending")} tone="red" icon={ChatCircleIcon} />
      </div>
    </section>
  );
}

// ── Tickets that need attention ──────────────────────────────────────

const SOURCE_TONE: Partial<Record<TicketSource, string>> = {
  email: "text-[#3B82F6]",
  web_form: "text-[#3B82F6]",
  portal: "text-[#3B82F6]",
  chat: "text-[#8B5CF6]",
  social: "text-[#8B5CF6]",
};

const PRIORITY_BADGE: Record<TicketPriority, string> = {
  urgent: "bg-[#FEF2F2] text-[#EF4444]",
  high: "bg-[#FEF2F2] text-[#EF4444]",
  medium: "bg-[#EFF6FF] text-[#2563EB]",
  low: "bg-[#F3F4F6] text-[#4B5563]",
};

/** Time left on the clock that matters now, coloured by urgency; tickets paused on the customer show "Waiting". */
function SlaLeft({ ticket, now }: { ticket: TicketSummary; now: number }) {
  if (ticket.status === "pending") {
    return <span className="text-[13px] leading-5 font-medium whitespace-nowrap text-[#D97706]">Waiting</span>;
  }
  const clock = focusClock(ticket.sla);
  const left = Date.parse(clock.due) - now;
  const tone =
    clock.state === "breached" || (clock.state === "at_risk" && left < 3_600_000) ? BAD : clock.state === "met" ? GOOD : clock.state === "paused" ? "text-ink-muted" : WARN;
  const IconCmp = clock.state === "breached" ? WarningCircleIcon : clock.state === "met" ? CheckCircleIcon : ClockIcon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] leading-5 font-medium whitespace-nowrap", tone)} title={`${clock.label} target`}>
      <IconCmp size={16} weight="bold" aria-hidden className="shrink-0" />
      {slaClockText(clock.state, clock.due, now)}
    </span>
  );
}

function AttentionList({ tickets, now }: { tickets: TicketSummary[]; now: number }) {
  return (
    <Card label="Tickets needing attention">
      <CardHeader title="Tickets needing attention" action={<ViewAll href={ticketViewHref("mine")} />} />
      {tickets.length ? (
        <ul className="divide-y divide-line-soft px-5 pb-2">
          {tickets.map((t) => {
            const SourceIcon = SOURCE_ICON[t.source];
            return (
              <li key={t.id}>
                <Link
                  href={ticketHref(t.id, { view: "mine" })}
                  className="group -mx-2 flex items-start gap-3 sm:gap-4 rounded-xl px-2 py-6 transition-colors hover:bg-desk-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-desk-action"
                >
                  <PersonAvatar name={t.contact.name} src={t.contact.avatar} size="xl" className="[&_[data-slot=avatar]]:size-10 sm:[&_[data-slot=avatar]]:size-12" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[15px] leading-6 font-semibold text-ink group-hover:text-desk sm:line-clamp-1">{t.subject}</span>
                    <span className="block truncate text-[13px] leading-5 text-ink-body">{t.preview}</span>
                    <span className="mt-1.5 block truncate text-[13px] leading-5 text-ink-muted">
                      {t.contact.name} · {t.customer.name}
                    </span>
                  </span>
                  <span className={cn("hidden shrink-0 pt-0.5 sm:block", SOURCE_TONE[t.source] ?? "text-ink-muted")} title={SOURCE_LABEL[t.source]}>
                    <SourceIcon size={20} aria-hidden />
                    <span className="sr-only">Via {SOURCE_LABEL[t.source]}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-2.5 pt-0.5 sm:w-24">
                    <SlaLeft ticket={t} now={now} />
                    <span className={cn("rounded-md px-3 py-1 text-[12px] leading-4 font-medium", PRIORITY_BADGE[t.priority])}>
                      {PRIORITY_META[t.priority].label}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="flex items-center gap-2 px-5 pb-6 text-body text-ink-muted">
          <CheckCircleIcon size={16} aria-hidden className="shrink-0 text-desk" />
          You&apos;re all caught up — no open tickets are assigned to you.
        </p>
      )}
    </Card>
  );
}

// ── My team ──────────────────────────────────────────────────────────

const PRESENCE: Record<Agent["status"], { label: string; dot: string }> = {
  available: { label: "Online", dot: "bg-emerald-500" },
  busy: { label: "Busy", dot: "bg-amber-500" },
  away: { label: "Away", dot: "bg-slate-400" },
};

function MyTeam({ members }: { members: Overview["team"] }) {
  return (
    <Card label="My team">
      <CardHeader title="My team" action={<ViewAll href={ticketViewHref("team")} label="View team" />} />
      {members.length ? (
        <ul className="px-5 pt-1 pb-4">
          {members.map(({ agent, open, waiting }) => (
            <li key={agent.id} className="flex items-center gap-3 py-2">
              <PersonAvatar name={agent.name} src={agent.avatar} size="lg" status={agent.status} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] leading-5 font-semibold text-ink">{agent.name}</span>
                <span className="flex items-center gap-1.5 text-[12px] leading-4 text-ink-muted">
                  <span className={cn("size-2 shrink-0 rounded-full", PRESENCE[agent.status].dot)} aria-hidden />
                  {PRESENCE[agent.status].label}
                </span>
              </span>
              <span className="w-16 shrink-0 sm:w-[88px]">
                <span className="block text-[14px] leading-5 font-semibold text-ink tabular-nums">{open}</span>
                <span className="block text-[12px] leading-4 text-ink-muted">Open</span>
              </span>
              <span className="w-14 shrink-0 sm:w-16">
                <span className="block text-[14px] leading-5 font-semibold text-ink tabular-nums">{waiting}</span>
                <span className="block text-[12px] leading-4 text-ink-muted">Waiting</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 pb-6 text-body text-ink-muted">No teammates yet.</p>
      )}
    </Card>
  );
}

// ── Recent activity ──────────────────────────────────────────────────

const ACTIVITY_ICON: Record<TeamActivityItem["kind"], { icon: Icon; tone?: Tone }> = {
  resolved: { icon: SealCheckIcon, tone: "desk" },
  reply: { icon: ChatCircleTextIcon },
  assigned: { icon: UsersIcon },
  note: { icon: NotePencilIcon, tone: "orange" },
  status: { icon: ClockIcon },
  priority: { icon: FlagIcon },
  tag: { icon: TagIcon },
};

function RecentActivity({ items }: { items: TeamActivityItem[] }) {
  return (
    <Card label="Recent activity">
      <CardHeader title="Recent activity" action={<ViewAll href={ticketViewHref("recent")} />} />
      {items.length ? (
        <ol className="px-5 pt-1 pb-4">
          {items.map((a, i) => {
            const { icon: IconCmp, tone } = ACTIVITY_ICON[a.kind];
            return (
              <li key={a.id} className="flex gap-3">
                <span className="flex shrink-0 flex-col items-center">
                  <span
                    className="inline-flex size-7 items-center justify-center rounded-lg text-ink-body"
                    style={tone ? { backgroundColor: TONES[tone].tint, color: TONES[tone].fg } : undefined}
                  >
                    <IconCmp size={18} weight={tone === "desk" ? "fill" : "regular"} aria-hidden />
                  </span>
                  {i < items.length - 1 && <span className="my-1 w-px flex-1 bg-line" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1 pb-5">
                  <div className="flex items-start gap-3">
                    <p className="min-w-0 flex-1 text-[13px] leading-5 text-ink-body">
                      <span className="font-medium text-ink">{a.agent.name}</span> {a.action}{" "}
                      <Link
                        href={ticketHref(a.ticket.id)}
                        className="font-semibold whitespace-nowrap text-ink hover:text-desk hover:underline focus-visible:outline-2 focus-visible:outline-desk-action"
                      >
                        #{a.ticket.ticketNumber}
                      </Link>
                    </p>
                    <TimeLabel iso={a.timestamp} className="shrink-0 pt-0.5 text-[12px] leading-4 text-ink-muted" />
                  </div>
                  <p className="truncate text-[12px] leading-4 text-ink-muted">{a.ticket.subject}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-5 pb-6 text-body text-ink-muted">No team activity yet.</p>
      )}
    </Card>
  );
}

// ── Performance stats ────────────────────────────────────────────────

/** "↑ 12%" against the window before — green when the change is good, red when it isn't. */
function PercentDelta({ trend, lowerIsBetter }: { trend: Trend; lowerIsBetter?: boolean }) {
  if (trend.value === null || trend.previous === null || trend.previous === 0) return null;
  const diff = trend.value - trend.previous;
  if (diff === 0) return <span className="text-[13px] font-semibold text-ink-muted">0%</span>;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  const ArrowCmp = diff > 0 ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[13px] leading-5 font-semibold", good ? GOOD : BAD)}>
      <ArrowCmp size={14} weight="bold" aria-hidden />
      <span className="sr-only">{diff > 0 ? "Up" : "Down"}</span>
      {Math.round((Math.abs(diff) / trend.previous) * 100)}%
    </span>
  );
}

/** Small trend line; empty buckets are skipped so the line stays continuous. */
function Sparkline({ values, color = TONES.desk.fg }: { values: (number | null)[]; color?: string }) {
  const gradient = useId();
  const W = 96;
  const H = 36;
  const pts = values.flatMap((v, i) => (v === null ? [] : [{ i, v }]));
  if (pts.length < 2) return <span className="h-9 w-24 shrink-0" aria-hidden />;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => (max === min ? H / 2 : 3 + (1 - (v - min) / (max - min)) * (H - 6));
  const line = pts.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts[pts.length - 1].i).toFixed(1)},${H} L${x(pts[0].i).toFixed(1)},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="shrink-0 overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradient})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  trend,
  series,
  tone,
  icon: IconCmp,
  lowerIsBetter,
}: {
  label: string;
  value: string;
  trend: Trend;
  series: (number | null)[];
  tone: Tone;
  icon: Icon;
  lowerIsBetter?: boolean;
}) {
  return (
    <Card label={label} className="flex items-center gap-4 px-5 py-5">
      <IconDisc tone={tone} size={48}>
        <IconCmp size={28} aria-hidden />
      </IconDisc>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] leading-5 text-ink-body">{label}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
          <span className="text-[32px] leading-10 font-bold tracking-tight whitespace-nowrap text-ink tabular-nums">{value}</span>
          <PercentDelta trend={trend} lowerIsBetter={lowerIsBetter} />
        </p>
      </div>
      <Sparkline values={series} />
    </Card>
  );
}

function PerformanceStats({ data, series, range }: { data: Overview["performance"]; series: Overview["series"]; range: OverviewRange }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        label={RANGE_LABEL[range].resolved}
        value={String(data.resolved.value ?? 0)}
        trend={data.resolved}
        series={series.resolved}
        tone="desk"
        icon={CheckCircleIcon}
      />
      <StatCard
        label="First response time"
        value={data.firstResponseMins.value === null ? "—" : formatDuration(data.firstResponseMins.value * 60_000)}
        trend={data.firstResponseMins}
        series={series.firstResponseMins}
        tone="blue"
        icon={TimerIcon}
        lowerIsBetter
      />
      <StatCard
        label="SLA compliance"
        value={data.slaCompliance.value === null ? "—" : `${data.slaCompliance.value}%`}
        trend={data.slaCompliance}
        series={series.slaCompliance}
        tone="purple"
        icon={ChartBarIcon}
      />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

function RangePicker({ range, onChange, now }: { range: OverviewRange; onChange: (r: OverviewRange) => void; now: number }) {
  const today = new Date(now).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const label = (r: OverviewRange) => (r === "today" ? `Today, ${today}` : RANGE_LABEL[r].menu);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Date range: ${label(range)}`}
        className="inline-flex h-10 items-center gap-2.5 rounded-lg border border-line bg-card px-3.5 text-[14px] leading-5 text-ink transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action data-[state=open]:border-desk"
      >
        <CalendarBlankIcon size={18} aria-hidden className="text-ink-body" />
        {label(range)}
        <CaretDownIcon size={14} aria-hidden className="ml-3 text-ink-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl">
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
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>
      <Skeleton className="h-[98px] rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Skeleton className="h-[590px] rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-[268px] rounded-2xl" />
          <Skeleton className="h-[306px] rounded-2xl" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[110px] rounded-2xl" />
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-9 font-bold tracking-tight text-ink">Overview</h1>
          <p className="mt-1 text-[15px] leading-6 text-ink-muted">A quick view of your support operation</p>
        </div>
        <div className="shrink-0 self-start">
          <RangePicker range={range} onChange={setRange} now={now} />
        </div>
      </div>

      <QueueStrip queues={data.queues} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <AttentionList tickets={data.attention} now={now} />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
          <MyTeam members={data.team} />
          <RecentActivity items={data.activity} />
        </div>
      </div>

      <PerformanceStats data={data.performance} series={data.series} range={range} />
    </div>
  );
}
