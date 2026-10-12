/**
 * Mock reporting API. Computed on read from the live ticket store — like the
 * Overview, it leaves out spam and the extra listing-only tickets, so the two
 * screens always agree on volumes and SLA figures.
 */
import { AGENTS, TEAMS } from "@/lib/mock-data/agents";
import { ticketRecords, ticketRows } from "@/lib/api/tickets";
import { focusClock } from "@/lib/sla";
import { ACTIVE_STATUSES } from "@/lib/ticket-meta";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_SOURCES,
  TICKET_STATUSES,
  type Agent,
  type Team,
  type TicketCategory,
  type TicketPriority,
  type TicketRecord,
  type TicketSource,
  type TicketStatus,
  type TicketSummary,
} from "@/lib/types/ticket";

const delay = (ms = 140 + Math.random() * 160) => new Promise((r) => setTimeout(r, ms));

export const REPORT_RANGES = ["7d", "30d", "90d"] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];
export const REPORT_RANGE_LABEL: Record<ReportRange, string> = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };

const DAY = 86_400_000;
const RANGE_DAYS: Record<ReportRange, number> = { "7d": 7, "30d": 30, "90d": 90 };
/** Daily points for a week or a month, weekly for a quarter. */
const BUCKET_DAYS: Record<ReportRange, number> = { "7d": 1, "30d": 1, "90d": 7 };

type Window = readonly [from: number, to: number];
const within = (iso: string | null, [from, to]: Window) => iso !== null && Date.parse(iso) > from && Date.parse(iso) <= to;

export interface Metric {
  value: number | null;
  previous: number | null;
}

export interface Breakdown<K extends string> {
  key: K;
  count: number;
}

export interface AgentRow {
  agent: Agent;
  open: number;
  resolved: number;
  replies: number;
  avgFirstResponseMins: number | null;
  slaCompliance: number | null;
}

export interface TeamRow {
  team: Team;
  created: number;
  resolved: number;
  open: number;
  slaCompliance: number | null;
}

export interface SlaRow {
  priority: TicketPriority;
  firstResponse: { met: number; total: number };
  resolution: { met: number; total: number };
}

export interface Report {
  range: ReportRange;
  teamId: string | null;
  kpis: {
    created: Metric;
    resolved: Metric;
    firstResponseMins: Metric;
    resolutionMins: Metric;
    slaCompliance: Metric;
    backlog: number;
  };
  /** Created vs resolved per bucket, oldest first. */
  volume: { label: string; start: string; created: number; resolved: number }[];
  byChannel: Breakdown<TicketSource>[];
  byPriority: Breakdown<TicketPriority>[];
  byCategory: Breakdown<TicketCategory>[];
  /** Current status of tickets created in the range. */
  byStatus: Breakdown<TicketStatus>[];
  agents: AgentRow[];
  teams: TeamRow[];
  sla: SlaRow[];
  breached: TicketSummary[];
  atRisk: TicketSummary[];
}

/** SLA clocks that stopped — or ran out — inside the window. */
function clocks(tickets: readonly TicketRecord[], w: Window, kind?: "first" | "resolution") {
  return tickets
    .flatMap((t) => [
      ...(kind !== "resolution" ? [[t.sla.firstResponseDue, t.sla.firstRespondedAt] as const] : []),
      ...(kind !== "first" ? [[t.sla.resolutionDue, t.sla.resolvedAt] as const] : []),
    ])
    .filter(([due, done]) => within(done, w) || (done === null && within(due, w)));
}
const metCount = (cs: ReturnType<typeof clocks>) => cs.filter(([due, done]) => done !== null && Date.parse(done) <= Date.parse(due)).length;
const pct = (met: number, total: number) => (total ? Math.round((met / total) * 100) : null);
const avgMins = (spans: number[]) => (spans.length ? Math.round(spans.reduce((a, b) => a + b, 0) / spans.length / 60_000) : null);

function windowStats(tickets: readonly TicketRecord[], w: Window) {
  const responded = tickets.filter((t) => within(t.sla.firstRespondedAt, w));
  const resolved = tickets.filter((t) => within(t.sla.resolvedAt, w));
  const cs = clocks(tickets, w);
  return {
    created: tickets.filter((t) => within(t.createdAt, w)).length,
    resolved: resolved.length,
    firstResponseMins: avgMins(responded.map((t) => Date.parse(t.sla.firstRespondedAt!) - Date.parse(t.createdAt))),
    resolutionMins: avgMins(resolved.map((t) => Date.parse(t.sla.resolvedAt!) - Date.parse(t.createdAt))),
    slaCompliance: pct(metCount(cs), cs.length),
  };
}

function breakdown<K extends string>(keys: readonly K[], values: K[]): Breakdown<K>[] {
  return keys.map((key) => ({ key, count: values.filter((v) => v === key).length })).sort((a, b) => b.count - a.count);
}

const bucketLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export async function getReport(range: ReportRange, teamId: string | null = null): Promise<Report> {
  await delay();
  const now = Date.now();
  const onTeam = (id: string) => !teamId || id === teamId;
  const records = ticketRecords({ analytics: true }).filter((t) => onTeam(t.teamId));
  const rows = ticketRows({ analytics: true }).filter((t) => onTeam(t.team.id));
  const span = RANGE_DAYS[range] * DAY;
  const current: Window = [now - span, now];
  const before: Window = [now - 2 * span, now - span];
  const cur = windowStats(records, current);
  const prev = windowStats(records, before);
  const metric = (k: keyof typeof cur): Metric => ({ value: cur[k], previous: prev[k] });

  const bucket = BUCKET_DAYS[range] * DAY;
  const volume = Array.from({ length: Math.round(span / bucket) }, (_, i) => {
    const w: Window = [current[0] + i * bucket, current[0] + (i + 1) * bucket];
    const startDate = new Date(w[0] + 1);
    return {
      label: bucketLabel.format(startDate),
      start: startDate.toISOString(),
      created: records.filter((t) => within(t.createdAt, w)).length,
      resolved: records.filter((t) => within(t.sla.resolvedAt, w)).length,
    };
  });

  const createdInRange = rows.filter((t) => within(t.createdAt, current));
  const isActive = (s: TicketStatus) => ACTIVE_STATUSES.includes(s);

  const agents: AgentRow[] = AGENTS.filter((a) => onTeam(a.teamId)).map((agent) => {
    const theirs = records.filter((t) => t.assigneeId === agent.id);
    const responded = theirs.filter((t) => within(t.sla.firstRespondedAt, current));
    const cs = clocks(theirs, current);
    return {
      agent,
      open: rows.filter((t) => t.assignee?.id === agent.id && isActive(t.status)).length,
      resolved: theirs.filter((t) => within(t.sla.resolvedAt, current)).length,
      replies: records.reduce(
        (n, t) => n + t.messages.filter((m) => m.author.id === agent.id && m.visibility === "public" && within(m.timestamp, current)).length,
        0,
      ),
      avgFirstResponseMins: avgMins(responded.map((t) => Date.parse(t.sla.firstRespondedAt!) - Date.parse(t.createdAt))),
      slaCompliance: pct(metCount(cs), cs.length),
    };
  });

  const teams: TeamRow[] = TEAMS.filter((t) => onTeam(t.id)).map((team) => {
    const theirs = records.filter((t) => t.teamId === team.id);
    const cs = clocks(theirs, current);
    return {
      team,
      created: theirs.filter((t) => within(t.createdAt, current)).length,
      resolved: theirs.filter((t) => within(t.sla.resolvedAt, current)).length,
      open: theirs.filter((t) => isActive(t.status)).length,
      slaCompliance: pct(metCount(cs), cs.length),
    };
  });

  const sla: SlaRow[] = [...TICKET_PRIORITIES].reverse().map((priority) => {
    const theirs = records.filter((t) => t.priority === priority);
    const fr = clocks(theirs, current, "first");
    const res = clocks(theirs, current, "resolution");
    return { priority, firstResponse: { met: metCount(fr), total: fr.length }, resolution: { met: metCount(res), total: res.length } };
  });

  const active = rows.filter((t) => isActive(t.status));
  return {
    range,
    teamId,
    kpis: {
      created: metric("created"),
      resolved: metric("resolved"),
      firstResponseMins: metric("firstResponseMins"),
      resolutionMins: metric("resolutionMins"),
      slaCompliance: metric("slaCompliance"),
      backlog: active.length,
    },
    volume,
    byChannel: breakdown(TICKET_SOURCES, createdInRange.map((t) => t.source)),
    byPriority: [...TICKET_PRIORITIES].reverse().map((key) => ({ key, count: createdInRange.filter((t) => t.priority === key).length })),
    byCategory: breakdown(TICKET_CATEGORIES, createdInRange.map((t) => t.category)),
    byStatus: TICKET_STATUSES.map((key) => ({ key, count: createdInRange.filter((t) => t.status === key).length })),
    agents,
    teams,
    sla,
    breached: active.filter((t) => focusClock(t.sla).state === "breached"),
    atRisk: active.filter((t) => focusClock(t.sla).state === "at_risk"),
  };
}
