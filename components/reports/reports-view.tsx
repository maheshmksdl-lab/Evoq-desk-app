"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarBlankIcon,
  ChartBarIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  HourglassIcon,
  TableIcon,
  TicketIcon,
  TimerIcon,
  TrayIcon,
} from "@phosphor-icons/react/dist/ssr";
import { DetailTabs, FilterSelect, PageShell, SecondaryButton, TONES, type Tone } from "@/components/shared/desk-ui";
import { bodyCell, downloadCsv, headCell, ModuleHeader, Panel } from "@/components/shared/module-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { TicketPriorityBadge } from "@/components/tickets/ticket-priority-badge";
import { SlaLeft } from "@/components/tickets/ticket-sla-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { useReport } from "@/hooks/use-desk-modules";
import { useHydrated } from "@/hooks/use-hydrated";
import { useNow } from "@/hooks/use-now";
import { useLookups } from "@/hooks/use-tickets";
import { useUrlState } from "@/hooks/use-url-state";
import { REPORT_RANGE_LABEL, REPORT_RANGES, type Metric, type Report, type ReportRange } from "@/lib/api/reports";
import { formatDuration } from "@/lib/format";
import { CATEGORY_LABEL, PRIORITY_META, SOURCE_LABEL, STATUS_META } from "@/lib/ticket-meta";
import { ticketHref, ticketListHref } from "@/lib/ticket-routes";
import type { TicketSummary } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { BarList, Legend, Meter, SERIES, VolumeChart } from "./report-charts";

type Tab = "overview" | "agents" | "teams" | "sla";
const TABS: Tab[] = ["overview", "agents", "teams", "sla"];

const mins = (m: number | null) => (m === null ? "—" : formatDuration(m * 60_000));

/** "↑ 12%" against the previous period — green when the change is good. */
function Delta({ metric, lowerIsBetter }: { metric: Metric; lowerIsBetter?: boolean }) {
  if (metric.value === null || metric.previous === null || metric.previous === 0) return <span className="text-[12px] text-ink-muted">No prior data</span>;
  const diff = metric.value - metric.previous;
  if (diff === 0) return <span className="text-[12px] font-semibold text-ink-muted">No change</span>;
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  const ArrowCmp = diff > 0 ? ArrowUpIcon : ArrowDownIcon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[12px] font-semibold", good ? "text-[#16A34A]" : "text-[#EF4444]")}>
      <ArrowCmp size={12} weight="bold" aria-hidden />
      <span className="sr-only">{diff > 0 ? "Up" : "Down"}</span>
      {Math.round((Math.abs(diff) / metric.previous) * 100)}%<span className="font-normal text-ink-muted">vs previous</span>
    </span>
  );
}

function Stat({ label, value, metric, tone, icon: IconCmp, lowerIsBetter, href }: { label: string; value: string; metric?: Metric; tone: Tone; icon: Icon; lowerIsBetter?: boolean; href?: string }) {
  const body = (
    <>
      <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: TONES[tone].tint, color: TONES[tone].fg }}>
        <IconCmp size={24} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] text-ink-body">{label}</span>
        <span className="block text-[26px] leading-8 font-bold tracking-tight text-ink tabular-nums">{value}</span>
        {metric ? <Delta metric={metric} lowerIsBetter={lowerIsBetter} /> : <span className="text-[12px] text-ink-muted">Right now</span>}
      </span>
    </>
  );
  const cls = "flex min-w-0 items-center gap-3 rounded-2xl border border-line-soft bg-card px-4 py-4 shadow-card";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-desk")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Reports & analytics: volume, response and resolution times, SLA compliance, by agent and team. */
export function ReportsView() {
  const [state, setState] = useUrlState({ tab: "overview", range: "30d", team: "" });
  const range = (REPORT_RANGES as readonly string[]).includes(state.range) ? (state.range as ReportRange) : "30d";
  const tab = (TABS as string[]).includes(state.tab) ? (state.tab as Tab) : "overview";
  const { data, isPending, isError, isPlaceholderData, refetch } = useReport(range, state.team || null);
  const { data: lookups } = useLookups();
  const hydrated = useHydrated();
  const teamName = lookups?.teams.find((t) => t.id === state.team)?.name;

  const exportCsv = () => {
    if (!data) return;
    const suffix = `${range}${state.team ? `-${state.team}` : ""}`;
    if (tab === "agents")
      downloadCsv(`agent-performance-${suffix}.csv`, ["Agent", "Team", "Open now", "Resolved", "Public replies", "Avg first response (min)", "SLA compliance %"], data.agents.map((a) => [a.agent.name, lookups?.teams.find((t) => t.id === a.agent.teamId)?.name ?? "", a.open, a.resolved, a.replies, a.avgFirstResponseMins, a.slaCompliance]));
    else if (tab === "teams") downloadCsv(`team-performance-${suffix}.csv`, ["Team", "Created", "Resolved", "Open now", "SLA compliance %"], data.teams.map((t) => [t.team.name, t.created, t.resolved, t.open, t.slaCompliance]));
    else if (tab === "sla")
      downloadCsv(`sla-${suffix}.csv`, ["Priority", "First response met", "First response total", "Resolution met", "Resolution total"], data.sla.map((s) => [PRIORITY_META[s.priority].label, s.firstResponse.met, s.firstResponse.total, s.resolution.met, s.resolution.total]));
    else downloadCsv(`ticket-volume-${suffix}.csv`, ["Period starting", "Created", "Resolved"], data.volume.map((v) => [v.start.slice(0, 10), v.created, v.resolved]));
  };

  return (
    <PageShell>
      <ModuleHeader
        title="Reports"
        subtitle={`How support is performing${teamName ? ` · ${teamName}` : ""}`}
        actions={
          <>
            <FilterSelect
              label="Team"
              value={state.team}
              placeholder="All teams"
              options={(lookups?.teams ?? []).map((t) => ({ value: t.id, label: t.name }))}
              onChange={(team) => setState({ team })}
              className="h-10 w-44 rounded-lg"
            />
            <FilterSelect
              label="Date range"
              value={range === "30d" ? "" : range}
              placeholder={REPORT_RANGE_LABEL["30d"]}
              icon={<CalendarBlankIcon size={18} aria-hidden className="text-ink-body" />}
              options={REPORT_RANGES.filter((r) => r !== "30d").map((r) => ({ value: r, label: REPORT_RANGE_LABEL[r] }))}
              onChange={(v) => setState({ range: v || "30d" })}
              className="h-10 w-48 rounded-lg [&>span]:text-ink"
            />
            <SecondaryButton icon={DownloadSimpleIcon} onClick={exportCsv} disabled={!data}>
              Export CSV
            </SecondaryButton>
          </>
        }
      />

      {!hydrated || isPending ? (
        <div aria-busy="true" aria-label="Loading reports" className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-[380px] rounded-2xl" />
        </div>
      ) : isError ? (
        <ErrorState title="Unable to load reports" action={<SecondaryButton onClick={() => refetch()}>Try again</SecondaryButton>} />
      ) : (
        <div className={cn("space-y-5 transition-opacity", isPlaceholderData && "opacity-60")}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <Stat label="Tickets created" value={String(data.kpis.created.value ?? 0)} metric={data.kpis.created} tone="blue" icon={TicketIcon} />
            <Stat label="Tickets resolved" value={String(data.kpis.resolved.value ?? 0)} metric={data.kpis.resolved} tone="desk" icon={CheckCircleIcon} />
            <Stat label="Avg first response" value={mins(data.kpis.firstResponseMins.value)} metric={data.kpis.firstResponseMins} tone="purple" icon={TimerIcon} lowerIsBetter />
            <Stat label="Avg resolution time" value={mins(data.kpis.resolutionMins.value)} metric={data.kpis.resolutionMins} tone="amber" icon={HourglassIcon} lowerIsBetter />
            <Stat label="SLA compliance" value={data.kpis.slaCompliance.value === null ? "—" : `${data.kpis.slaCompliance.value}%`} metric={data.kpis.slaCompliance} tone="green" icon={ChartBarIcon} />
            <Stat label="Open backlog" value={String(data.kpis.backlog)} tone="orange" icon={TrayIcon} href={ticketListHref({ view: "all", status: ["open", "pending", "on_hold"], team: state.team ? [state.team] : [] })} />
          </div>

          <Panel bodyClassName="px-4 pb-4 sm:px-5">
            <DetailTabs<Tab>
              label="Report"
              active={tab}
              onChange={(t) => setState({ tab: t })}
              tabs={[
                { key: "overview", label: "Volume & breakdowns" },
                { key: "agents", label: "Agent performance" },
                { key: "teams", label: "Teams" },
                { key: "sla", label: "SLA", count: data.breached.length || undefined },
              ]}
            />
            <div className="pt-5">
              {tab === "overview" && <OverviewTab data={data} teamFilter={state.team} />}
              {tab === "agents" && <AgentsTab data={data} />}
              {tab === "teams" && <TeamsTab data={data} onPick={(team) => setState({ team, tab: "agents" })} />}
              {tab === "sla" && <SlaTab data={data} />}
            </div>
          </Panel>
        </div>
      )}
    </PageShell>
  );
}

function OverviewTab({ data, teamFilter }: { data: Report; teamFilter: string }) {
  const router = useRouter();
  const [table, setTable] = useState(false);
  const created = data.kpis.created.value ?? 0;
  const drill = (patch: Record<string, string[]>) => router.push(ticketListHref({ view: "all", team: teamFilter ? [teamFilter] : [], created: data.range === "7d" ? "7d" : data.range === "30d" ? "30d" : "90d", ...patch }));
  return (
    <div className="space-y-6">
      <section aria-label="Ticket volume">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Ticket volume</h3>
            <p className="text-[13px] text-ink-muted">Created vs resolved, {data.range === "90d" ? "weekly" : "daily"}</p>
          </div>
          <div className="flex items-center gap-4">
            <Legend
              items={[
                { label: "Created", color: SERIES.created, value: data.kpis.created.value ?? 0 },
                { label: "Resolved", color: SERIES.resolved, value: data.kpis.resolved.value ?? 0 },
              ]}
            />
            <button
              type="button"
              onClick={() => setTable((t) => !t)}
              aria-pressed={table}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[13px] font-medium text-ink-body hover:border-desk hover:text-desk aria-pressed:border-desk aria-pressed:text-desk"
            >
              <TableIcon size={15} aria-hidden /> {table ? "Show chart" : "Show table"}
            </button>
          </div>
        </div>
        {table ? (
          <div className="max-h-[300px] overflow-auto rounded-xl border border-line-soft">
            <table className="w-full border-separate border-spacing-0">
              <thead className="sticky top-0">
                <tr>
                  <th scope="col" className={headCell}>Period starting</th>
                  <th scope="col" className={cn(headCell, "text-right")}>Created</th>
                  <th scope="col" className={cn(headCell, "text-right")}>Resolved</th>
                </tr>
              </thead>
              <tbody>
                {data.volume.map((v) => (
                  <tr key={v.start}>
                    <td className={bodyCell}>{v.label}</td>
                    <td className={cn(bodyCell, "text-right tabular-nums")}>{v.created}</td>
                    <td className={cn(bodyCell, "text-right tabular-nums")}>{v.resolved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <VolumeChart data={data.volume} />
        )}
      </section>

      <div className="grid gap-6 border-t border-line-soft pt-5 md:grid-cols-2 2xl:grid-cols-4">
        <section aria-label="By channel">
          <h3 className="mb-3 text-[15px] font-semibold text-ink">By channel</h3>
          <BarList total={created} rows={data.byChannel.filter((r) => r.count).map((r) => ({ key: r.key, label: SOURCE_LABEL[r.key], count: r.count }))} onSelect={(k) => drill({ source: [k] })} />
        </section>
        <section aria-label="By priority">
          <h3 className="mb-3 text-[15px] font-semibold text-ink">By priority</h3>
          <BarList total={created} rows={data.byPriority.map((r) => ({ key: r.key, label: PRIORITY_META[r.key].label, count: r.count }))} onSelect={(k) => drill({ priority: [k] })} />
        </section>
        <section aria-label="By category">
          <h3 className="mb-3 text-[15px] font-semibold text-ink">By category</h3>
          <BarList total={created} rows={data.byCategory.filter((r) => r.count).map((r) => ({ key: r.key, label: CATEGORY_LABEL[r.key], count: r.count }))} onSelect={(k) => drill({ category: [k] })} />
        </section>
        <section aria-label="Current status">
          <h3 className="mb-3 text-[15px] font-semibold text-ink">Where they are now</h3>
          <BarList total={created} rows={data.byStatus.map((r) => ({ key: r.key, label: STATUS_META[r.key].label, count: r.count }))} onSelect={(k) => drill({ status: [k] })} />
        </section>
      </div>
      <p className="text-caption text-ink-muted">Breakdowns cover tickets created in the selected period. Select a bar to open those tickets.</p>
    </div>
  );
}

function AgentsTab({ data }: { data: Report }) {
  const sorted = [...data.agents].sort((a, b) => b.resolved - a.resolved || b.replies - a.replies);
  if (!sorted.length) return <EmptyState icon={ChartBarIcon} title="No agents on this team" className="py-10" />;
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[720px] border-separate border-spacing-0">
        <caption className="sr-only">Agent performance</caption>
        <thead>
          <tr>
            <th scope="col" className={headCell}>Agent</th>
            <th scope="col" className={cn(headCell, "text-right")}>Open now</th>
            <th scope="col" className={cn(headCell, "text-right")}>Resolved</th>
            <th scope="col" className={cn(headCell, "text-right")}>Public replies</th>
            <th scope="col" className={cn(headCell, "text-right")}>Avg first response</th>
            <th scope="col" className={headCell}>SLA compliance</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => (
            <tr key={a.agent.id} className="hover:bg-desk-surface">
              <td className={bodyCell}>
                <span className="flex items-center gap-3">
                  <PersonAvatar name={a.agent.name} src={a.agent.avatar} size="md" status={a.agent.status} />
                  <span>
                    <span className="block font-semibold text-ink">{a.agent.name}</span>
                    <span className="block text-[12px] text-ink-muted">{a.agent.role}</span>
                  </span>
                </span>
              </td>
              <td className={cn(bodyCell, "text-right tabular-nums")}>
                <Link href={ticketListHref({ view: "all", assignee: [a.agent.id], status: ["open", "pending", "on_hold"] })} className="font-semibold text-ink hover:text-desk">
                  {a.open}
                </Link>
              </td>
              <td className={cn(bodyCell, "text-right font-semibold text-ink tabular-nums")}>{a.resolved}</td>
              <td className={cn(bodyCell, "text-right tabular-nums")}>{a.replies}</td>
              <td className={cn(bodyCell, "text-right tabular-nums")}>{mins(a.avgFirstResponseMins)}</td>
              <td className={bodyCell}>
                <Meter met={a.slaCompliance ?? 0} total={a.slaCompliance === null ? 0 : 100} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamsTab({ data, onPick }: { data: Report; onPick: (team: string) => void }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[640px] border-separate border-spacing-0">
        <caption className="sr-only">Team performance</caption>
        <thead>
          <tr>
            <th scope="col" className={headCell}>Team</th>
            <th scope="col" className={cn(headCell, "text-right")}>Created</th>
            <th scope="col" className={cn(headCell, "text-right")}>Resolved</th>
            <th scope="col" className={cn(headCell, "text-right")}>Open now</th>
            <th scope="col" className={headCell}>SLA compliance</th>
            <th scope="col" className={headCell}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.teams.map((t) => (
            <tr key={t.team.id} className="hover:bg-desk-surface">
              <td className={cn(bodyCell, "font-semibold text-ink")}>{t.team.name}</td>
              <td className={cn(bodyCell, "text-right tabular-nums")}>{t.created}</td>
              <td className={cn(bodyCell, "text-right tabular-nums")}>{t.resolved}</td>
              <td className={cn(bodyCell, "text-right tabular-nums")}>
                <Link href={`/inbox/open?team=${t.team.id}`} className="font-semibold text-ink hover:text-desk">
                  {t.open}
                </Link>
              </td>
              <td className={bodyCell}>
                <Meter met={t.slaCompliance ?? 0} total={t.slaCompliance === null ? 0 : 100} />
              </td>
              <td className={cn(bodyCell, "text-right")}>
                <button type="button" onClick={() => onPick(t.team.id)} className="text-[13px] font-medium whitespace-nowrap text-desk hover:text-desk-press">
                  View agents
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlaTab({ data }: { data: Report }) {
  const now = useNow();
  return (
    <div className="space-y-6">
      <div className="-mx-4 overflow-x-auto sm:-mx-5">
        <table className="w-full min-w-[620px] border-separate border-spacing-0">
          <caption className="sr-only">SLA compliance by priority</caption>
          <thead>
            <tr>
              <th scope="col" className={headCell}>Priority</th>
              <th scope="col" className={headCell}>First response met</th>
              <th scope="col" className={headCell}>Resolution met</th>
            </tr>
          </thead>
          <tbody>
            {data.sla.map((s) => (
              <tr key={s.priority}>
                <td className={bodyCell}>
                  <TicketPriorityBadge priority={s.priority} />
                </td>
                <td className={bodyCell}>
                  <Meter met={s.firstResponse.met} total={s.firstResponse.total} />
                </td>
                <td className={bodyCell}>
                  <Meter met={s.resolution.met} total={s.resolution.total} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <SlaList title="Breached now" tickets={data.breached} now={now} empty="No open tickets have missed their SLA." view="overdue" />
        <SlaList title="At risk now" tickets={data.atRisk} now={now} empty="Nothing is close to its SLA target." view="sla_at_risk" />
      </div>
    </div>
  );
}

function SlaList({ title, tickets, now, empty, view }: { title: string; tickets: TicketSummary[]; now: number; empty: string; view: "overdue" | "sla_at_risk" }) {
  return (
    <section aria-label={title} className="rounded-xl border border-line-soft">
      <header className="flex items-center justify-between border-b border-line-soft px-4 py-3">
        <h3 className="text-[15px] font-semibold text-ink">
          {title} <span className="text-ink-muted tabular-nums">{tickets.length}</span>
        </h3>
        {tickets.length > 0 && (
          <Link href={ticketListHref({ view })} className="text-[13px] font-medium text-desk hover:text-desk-press">
            View all
          </Link>
        )}
      </header>
      {tickets.length ? (
        <ul className="divide-y divide-line-soft">
          {tickets.slice(0, 6).map((t) => (
            <li key={t.id}>
              <Link href={ticketHref(t.id, { view })} className="flex items-center gap-3 px-4 py-3 hover:bg-desk-surface">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{t.subject}</span>
                  <span className="block truncate text-[12px] text-ink-muted">
                    #{t.ticketNumber} · {t.customer.name} · {t.assignee?.name ?? "Unassigned"}
                  </span>
                </span>
                <SlaLeft sla={t.sla} now={now} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-body text-ink-muted">{empty}</p>
      )}
    </section>
  );
}
