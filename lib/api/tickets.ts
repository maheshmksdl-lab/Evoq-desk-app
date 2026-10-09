/**
 * Mock ticket API. Every function is async and returns plain JSON-shaped
 * data, mirroring what REST endpoints would return. Replacing this module
 * with real fetch calls is the only change needed to connect a backend.
 *
 * State lives in memory for the browser session — nothing is persisted.
 */
import { AGENTS, CURRENT_AGENT_ID, TEAMS } from "@/lib/mock-data/agents";
import { CONTACTS, CUSTOMERS } from "@/lib/mock-data/customers";
import { KNOWLEDGE_ARTICLES, type KnowledgeArticle } from "@/lib/mock-data/knowledge";
import { buildTickets, LISTING_ONLY_TICKET_IDS, mentionsIn, SLA_POLICY, SUGGESTED_TAGS, ticketNumber } from "@/lib/mock-data/tickets";
import {
  composerSchema,
  createTicketSchema,
  tagSchema,
  type ComposerInput,
  type CreateTicketInput,
  type DateRange,
  type TicketQuery,
  type TicketView,
  TICKET_VIEWS,
} from "@/lib/schemas/ticket";
import { agentSchema, contactSchema, customerSchema, teamSchema, ticketRecordSchema } from "@/lib/schemas/entities";
import { evaluateSla, focusClock, slaSortValue } from "@/lib/sla";
import { ACTIVE_STATUSES, PRIORITY_META, STATUS_META } from "@/lib/ticket-meta";
import { CATEGORY_LABEL, TYPE_LABEL } from "@/lib/ticket-meta";
import type {
  ActivityType,
  Agent,
  Attachment,
  Contact,
  Customer,
  CustomerContext,
  RelatedTicketSummary,
  Team,
  Ticket,
  TicketCategory,
  TicketMessage,
  TicketPriority,
  TicketRecord,
  TicketStatus,
  TicketSummary,
  TicketSource,
  TicketType,
} from "@/lib/types/ticket";

// ── In-memory store ──────────────────────────────────────────────────

let store: TicketRecord[] | null = null;
const db = () => (store ??= seed());

/** Builds the mock store; in development it must pass the same schema a real API response would. */
function seed(): TicketRecord[] {
  const records = buildTickets(Date.now());
  if (process.env.NODE_ENV !== "production") {
    agentSchema.array().parse(AGENTS);
    teamSchema.array().parse(TEAMS);
    customerSchema.array().parse(CUSTOMERS);
    contactSchema.array().parse(CONTACTS);
    ticketRecordSchema.array().parse(records);
  }
  return records;
}

const agentById = new Map(AGENTS.map((a) => [a.id, a]));
const teamById = new Map(TEAMS.map((t) => [t.id, t]));
const customerById = new Map(CUSTOMERS.map((c) => [c.id, c]));
const contactById = new Map(CONTACTS.map((c) => [c.id, c]));

const delay = (ms = 120 + Math.random() * 180) => new Promise((r) => setTimeout(r, ms));

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}

function findRecord(id: string): TicketRecord {
  const rec = db().find((t) => t.id.toLowerCase() === id.toLowerCase());
  if (!rec) throw new NotFoundError(`Ticket ${id}`);
  return rec;
}

// ── Shaping ──────────────────────────────────────────────────────────

type TicketBase = Omit<TicketSummary, "messageCount" | "awaiting" | "preview">;

/** First line of real content: drop a leading greeting, collapse whitespace. */
function excerpt(body: string, max = 140) {
  const text = body.replace(/^\s*(hi|hello|hey|dear)\b[^\n]*\n+/i, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function toBase(t: TicketRecord, now: number): TicketBase {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    type: t.type,
    category: t.category,
    source: t.source,
    customer: customerById.get(t.customerId)!,
    contact: contactById.get(t.contactId)!,
    assignee: t.assigneeId ? agentById.get(t.assigneeId)! : null,
    team: teamById.get(t.teamId)!,
    sla: evaluateSla(t.sla, t.status, now),
    tags: t.tags,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    lastReplyAt: t.lastReplyAt,
    spam: t.spam,
  };
}

function toSummary(t: TicketRecord, now: number): TicketSummary {
  const publicMsgs = t.messages.filter((m) => m.visibility === "public");
  const last = publicMsgs[publicMsgs.length - 1];
  return {
    ...toBase(t, now),
    messageCount: publicMsgs.length,
    awaiting: last?.authorType === "agent" ? "customer" : "agent",
    preview: excerpt(last?.body ?? t.description),
  };
}

const toRelated = (t: TicketRecord): RelatedTicketSummary => ({
  id: t.id,
  ticketNumber: t.ticketNumber,
  subject: t.subject,
  status: t.status,
  priority: t.priority,
});

function toTicket(t: TicketRecord, now: number): Ticket {
  const summary = toBase(t, now);
  const all = db();
  const customerTickets = all.filter((x) => x.customerId === t.customerId);
  const customerContext: CustomerContext = {
    customer: summary.customer,
    contact: summary.contact,
    openTickets: customerTickets.filter((x) => ACTIVE_STATUSES.includes(x.status)).length,
    totalTickets: customerTickets.length,
    recentTickets: customerTickets
      .filter((x) => x.id !== t.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 4)
      .map(toRelated),
  };
  const merged = t.mergedIntoId ? all.find((x) => x.id === t.mergedIntoId) : undefined;
  return {
    ...summary,
    description: t.description,
    messages: t.messages,
    activities: [...t.activities].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    attachments: t.messages.flatMap((m) => m.attachments),
    relatedTickets: t.relatedTicketIds
      .map((rid) => all.find((x) => x.id === rid))
      .filter((x): x is TicketRecord => !!x)
      .map(toRelated),
    customerContext,
    followers: t.followerIds.map((id) => agentById.get(id)!).filter(Boolean),
    mergedInto: merged ? toRelated(merged) : null,
  };
}

// ── Querying ─────────────────────────────────────────────────────────

const isActive = (s: TicketStatus) => ACTIVE_STATUSES.includes(s);

/** "Recently updated" looks back one day. */
const RECENT_MS = 24 * 60 * 60_000;

function matchesView(t: TicketSummary, view: TicketView): boolean {
  switch (view) {
    case "all":
      return true;
    case "mine":
      return t.assignee?.id === CURRENT_AGENT_ID && isActive(t.status);
    case "unassigned":
      return !t.assignee && isActive(t.status);
    case "team":
      return t.team.id === agentById.get(CURRENT_AGENT_ID)!.teamId && isActive(t.status);
    case "open":
    case "pending":
    case "on_hold":
    case "resolved":
    case "closed":
      return t.status === view;
    case "high_priority":
      return (t.priority === "high" || t.priority === "urgent") && isActive(t.status);
    case "sla_at_risk":
      return isActive(t.status) && focusClock(t.sla).state === "at_risk";
    case "overdue":
      return isActive(t.status) && focusClock(t.sla).state === "breached";
    case "recent":
      return Date.now() - Date.parse(t.updatedAt) < RECENT_MS;
  }
}

function rangeStart(range: DateRange, now: number): number {
  if (range === "today") {
    const d = new Date(now);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }
  const days = { "7d": 7, "30d": 30, "90d": 90 }[range];
  return now - days * 86_400_000;
}

function matchesSearch(t: TicketSummary, q: string): boolean {
  const haystack = [
    t.ticketNumber,
    t.subject,
    t.customer.name,
    t.contact.name,
    t.contact.email,
    t.assignee?.name ?? "unassigned",
  ]
    .join(" \u0000 ")
    .toLowerCase();
  return q
    .toLowerCase()
    .replace(/#/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function matchesFilters(t: TicketSummary, q: TicketQuery, now: number): boolean {
  if (q.status.length && !q.status.includes(t.status)) return false;
  if (q.priority.length && !q.priority.includes(t.priority)) return false;
  if (q.type.length && !q.type.includes(t.type)) return false;
  if (q.category.length && !q.category.includes(t.category)) return false;
  if (q.source.length && !q.source.includes(t.source)) return false;
  if (q.team.length && !q.team.includes(t.team.id)) return false;
  if (q.customer.length && !q.customer.includes(t.customer.id)) return false;
  if (q.assignee.length && !q.assignee.includes(t.assignee?.id ?? "unassigned")) return false;
  if (q.sla.length && !(q.sla as string[]).includes(focusClock(t.sla).state)) return false;
  if (q.tags.length && !q.tags.some((tag) => t.tags.includes(tag))) return false;
  if ((q.spam === "only") !== t.spam) return false;
  if (q.created && Date.parse(t.createdAt) < rangeStart(q.created, now)) return false;
  if (q.updated && Date.parse(t.updatedAt) < rangeStart(q.updated, now)) return false;
  return true;
}

const SORTERS: Record<TicketQuery["sort"], (a: TicketSummary, b: TicketSummary) => number> = {
  updated_desc: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  updated_asc: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  created_desc: (a, b) => b.createdAt.localeCompare(a.createdAt),
  created_asc: (a, b) => a.createdAt.localeCompare(b.createdAt),
  priority_desc: (a, b) =>
    PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank || b.updatedAt.localeCompare(a.updatedAt),
  sla_asc: (a, b) => slaSortValue(a.sla) - slaSortValue(b.sla),
};

export interface TicketListResult {
  items: TicketSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export async function listTickets(query: TicketQuery): Promise<TicketListResult> {
  await delay();
  const now = Date.now();
  const rows = db()
    .map((t) => toSummary(t, now))
    .filter((t) => matchesView(t, query.view))
    .filter((t) => !query.q || matchesSearch(t, query.q))
    .filter((t) => matchesFilters(t, query, now))
    .sort(SORTERS[query.sort]);
  const pageCount = Math.max(1, Math.ceil(rows.length / query.size));
  const page = Math.min(query.page, pageCount);
  return {
    items: rows.slice((page - 1) * query.size, page * query.size),
    total: rows.length,
    page,
    pageSize: query.size,
    pageCount,
  };
}

export type ViewCounts = Record<TicketView, number>;

export async function getViewCounts(): Promise<ViewCounts> {
  await delay(80);
  const now = Date.now();
  const rows = db()
    .filter((t) => !t.spam)
    .map((t) => toSummary(t, now));
  return Object.fromEntries(TICKET_VIEWS.map((v) => [v, rows.filter((t) => matchesView(t, v)).length])) as ViewCounts;
}

export async function getTicket(id: string): Promise<Ticket | null> {
  await delay();
  try {
    return toTicket(findRecord(id), Date.now());
  } catch (e) {
    if (e instanceof NotFoundError) return null;
    throw e;
  }
}

export const OVERVIEW_RANGES = ["today", "7d", "30d"] as const satisfies readonly DateRange[];
export type OverviewRange = (typeof OVERVIEW_RANGES)[number];

/** A figure now and over the comparison window (yesterday / the previous period). */
export interface Trend {
  value: number | null;
  previous: number | null;
}

export interface TeamActivityItem {
  id: string;
  agent: Agent;
  /** What they did, e.g. "resolved" or "changed status to Pending on". */
  action: string;
  kind: "reply" | "resolved" | "assigned" | "note" | "status" | "priority" | "tag";
  ticket: { id: string; ticketNumber: string; subject: string };
  timestamp: string;
}

/** A teammate and the size of their queue. */
export interface TeamMemberLoad {
  agent: Agent;
  /** Assigned tickets in Open status. */
  open: number;
  /** Assigned tickets waiting on the customer. */
  waiting: number;
}

export interface Overview {
  agent: Agent;
  /** Queue sizes now and 24 hours ago. */
  queues: { allOpen: Trend; mine: Trend; unassigned: Trend; atRisk: Trend; waiting: Trend };
  /** The agent's unresolved tickets, most urgent first (breached, at risk, awaiting a reply, then the rest). */
  attention: TicketSummary[];
  attentionTotal: number;
  /** Latest things teammates did on tickets. */
  activity: TeamActivityItem[];
  /** Team performance over the range vs the window before it. */
  performance: { received: Trend; resolved: Trend; firstResponseMins: Trend; slaCompliance: Trend };
  /** The same figures across the range in equal buckets, oldest first — for sparklines. */
  series: { resolved: number[]; firstResponseMins: (number | null)[]; slaCompliance: (number | null)[] };
  /** The agent's teammates (own team first) and their queues. */
  team: TeamMemberLoad[];
  /** Latest customer message per ticket, newest first. */
  messages: { ticket: TicketSummary; message: TicketMessage }[];
  articles: KnowledgeArticle[];
  /** Tickets created in the range, by source. */
  channels: { source: TicketSource; count: number }[];
  /** Unresolved tickets whose SLA has already been missed. */
  breached: number;
}

const DAY_MS = 86_400_000;
const RANGE_DAYS: Record<OverviewRange, number> = { today: 1, "7d": 7, "30d": 30 };
/** Sparkline points per range: 3-hour, daily and 3-day buckets. */
const RANGE_BUCKETS: Record<OverviewRange, number> = { today: 8, "7d": 7, "30d": 10 };
const STATUS_BY_LABEL = new Map(Object.entries(STATUS_META).map(([k, m]) => [m.label.toLowerCase(), k as TicketStatus]));

/** The record as it stood at `at` — rewinds status, assignment and SLA stops logged after it. Null if not yet created. */
function asOf(t: TicketRecord, at: number): TicketRecord | null {
  if (Date.parse(t.createdAt) > at) return null;
  const later = (iso: string | null) => iso !== null && Date.parse(iso) > at;
  const firstChange = t.activities.find((a) => a.type === "status_changed" && later(a.timestamp));
  const from = firstChange?.description.match(/^Status changed from (.+?) to /)?.[1]?.toLowerCase();
  const firstAssign = t.activities.find((a) => a.type === "assigned");
  return {
    ...t,
    status: (from && STATUS_BY_LABEL.get(from)) || t.status,
    assigneeId: firstAssign && later(firstAssign.timestamp) ? null : t.assigneeId,
    sla: {
      ...t.sla,
      firstRespondedAt: later(t.sla.firstRespondedAt) ? null : t.sla.firstRespondedAt,
      resolvedAt: later(t.sla.resolvedAt) ? null : t.sla.resolvedAt,
    },
  };
}

const agentByName = new Map(AGENTS.map((a) => [a.name, a]));

/** Teammate activity → one line in the feed; null for events the feed doesn't show. */
function toActivityItem(t: TicketRecord, a: TicketRecord["activities"][number]): TeamActivityItem | null {
  const base = { id: a.id, ticket: { id: t.id, ticketNumber: t.ticketNumber, subject: t.subject }, timestamp: a.timestamp };
  const actor = agentByName.get(a.actor);
  const to = a.description.match(/ to (.+)$/)?.[1];
  switch (a.type) {
    case "assigned": {
      const agent = agentByName.get(a.description.replace(/^Assigned to /, ""));
      return agent ? { ...base, agent, kind: "assigned", action: "was assigned" } : null;
    }
    case "agent_replied":
      return actor ? { ...base, agent: actor, kind: "reply", action: "replied to" } : null;
    case "note_added":
      return actor ? { ...base, agent: actor, kind: "note", action: "added an internal note to" } : null;
    case "status_changed":
      if (!actor || !to) return null;
      return to === "Resolved"
        ? { ...base, agent: actor, kind: "resolved", action: "resolved" }
        : { ...base, agent: actor, kind: "status", action: `changed status to ${to} on` };
    case "priority_changed":
      return actor && to ? { ...base, agent: actor, kind: "priority", action: `changed priority to ${to} on` } : null;
    case "tag_added":
      return actor ? { ...base, agent: actor, kind: "tag", action: "tagged" } : null;
    default:
      return null;
  }
}

/** Overview for the signed-in agent: queues, what to work on, and the team's day. */
export async function getOverview(range: OverviewRange = "today"): Promise<Overview> {
  await delay();
  const now = Date.now();
  const me = currentAgent();
  // The extra listing tickets never count toward the Overview.
  const live = db().filter((t) => !t.spam && !LISTING_ONLY_TICKET_IDS.has(t.id));
  const rows = live.map((t) => toSummary(t, now));
  const dayAgo = now - DAY_MS;
  const yesterday = live.flatMap((t) => {
    const rec = asOf(t, dayAgo);
    return rec ? [toSummary(rec, dayAgo)] : [];
  });
  const queue = (view: TicketView): Trend => ({
    value: rows.filter((t) => matchesView(t, view)).length,
    previous: yesterday.filter((t) => matchesView(t, view)).length,
  });

  const state = (t: TicketSummary) => focusClock(t.sla).state;
  const rank = (t: TicketSummary) => (state(t) === "breached" ? 0 : state(t) === "at_risk" ? 1 : t.awaiting === "agent" && t.status === "open" ? 2 : 3);
  const mine = rows.filter((t) => matchesView(t, "mine")).sort((a, b) => rank(a) - rank(b) || slaSortValue(a.sla) - slaSortValue(b.sla));

  // Performance: the range, against a window of the same length right before it.
  const span = RANGE_DAYS[range] * DAY_MS;
  type Window = readonly [from: number, to: number];
  const current: Window = [now - span, now];
  const before: Window = [now - 2 * span, now - span];
  const within = (iso: string | null, [from, to]: Window) => iso !== null && Date.parse(iso) > from && Date.parse(iso) <= to;
  const perf = (w: Window) => {
    const responded = live.filter((t) => within(t.sla.firstRespondedAt, w));
    // SLA clocks that stopped — or ran out — inside the window.
    const clocks = live
      .flatMap((t) => [
        [t.sla.firstResponseDue, t.sla.firstRespondedAt] as const,
        [t.sla.resolutionDue, t.sla.resolvedAt] as const,
      ])
      .filter(([due, done]) => within(done, w) || (done === null && within(due, w)));
    const met = clocks.filter(([due, done]) => done !== null && Date.parse(done) <= Date.parse(due)).length;
    return {
      received: live.filter((t) => within(t.createdAt, w)).length,
      resolved: live.filter((t) => within(t.sla.resolvedAt, w)).length,
      firstResponseMins: responded.length
        ? Math.round(responded.reduce((sum, t) => sum + Date.parse(t.sla.firstRespondedAt!) - Date.parse(t.createdAt), 0) / responded.length / 60_000)
        : null,
      slaCompliance: clocks.length ? Math.round((met / clocks.length) * 100) : null,
    };
  };
  const cur = perf(current);
  const prev = perf(before);
  const trend = (k: keyof typeof cur): Trend => ({ value: cur[k], previous: prev[k] });
  const bucketCount = RANGE_BUCKETS[range];
  const bucketMs = span / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => perf([current[0] + i * bucketMs, current[0] + (i + 1) * bucketMs]));

  const team = AGENTS.filter((a) => a.id !== me.id)
    .sort((a, b) => Number(b.teamId === me.teamId) - Number(a.teamId === me.teamId))
    .slice(0, 4)
    .map((agent) => ({
      agent,
      open: rows.filter((t) => t.assignee?.id === agent.id && t.status === "open").length,
      waiting: rows.filter((t) => t.assignee?.id === agent.id && t.status === "pending").length,
    }));

  const byId = new Map(rows.map((t) => [t.id, t]));
  const channels = new Map<TicketSource, number>();
  for (const t of live) if (within(t.createdAt, current)) channels.set(t.source, (channels.get(t.source) ?? 0) + 1);

  return {
    agent: me,
    queues: { allOpen: queue("open"), mine: queue("mine"), unassigned: queue("unassigned"), atRisk: queue("sla_at_risk"), waiting: queue("pending") },
    attention: mine.slice(0, 5),
    attentionTotal: mine.length,
    activity: live
      .flatMap((t) => t.activities.map((a) => toActivityItem(t, a)))
      .filter((x): x is TeamActivityItem => x !== null && x.agent.id !== me.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 5),
    performance: { received: trend("received"), resolved: trend("resolved"), firstResponseMins: trend("firstResponseMins"), slaCompliance: trend("slaCompliance") },
    series: {
      resolved: buckets.map((b) => b.resolved),
      firstResponseMins: buckets.map((b) => b.firstResponseMins),
      slaCompliance: buckets.map((b) => b.slaCompliance),
    },
    team,
    messages: live
      .flatMap((t) => {
        const last = t.messages.findLast((m) => m.authorType === "customer" && m.visibility === "public");
        return last ? [{ ticket: byId.get(t.id)!, message: last }] : [];
      })
      .sort((a, b) => b.message.timestamp.localeCompare(a.message.timestamp))
      .slice(0, 4),
    articles: [...KNOWLEDGE_ARTICLES].sort((a, b) => b.uses - a.uses).slice(0, 3),
    channels: [...channels].map(([source, count]) => ({ source, count })),
    breached: rows.filter((t) => matchesView(t, "overdue")).length,
  };
}

export interface SearchResults {
  tickets: TicketSummary[];
  customers: { customer: Customer; contacts: Contact[]; openTickets: number }[];
}

export async function searchDesk(q: string): Promise<SearchResults> {
  await delay(90);
  const term = q.trim().toLowerCase();
  if (!term) return { tickets: [], customers: [] };
  const now = Date.now();
  const tickets = db()
    .map((t) => toSummary(t, now))
    .filter((t) => !t.spam && matchesSearch(t, term))
    .sort(SORTERS.updated_desc)
    .slice(0, 6);
  const customers = CUSTOMERS.map((customer) => {
    const contacts = CONTACTS.filter((c) => c.customerId === customer.id);
    const nameHit = customer.name.toLowerCase().includes(term) || customer.domain.includes(term);
    const matchedContacts = contacts.filter((c) => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term));
    if (!nameHit && !matchedContacts.length) return null;
    return {
      customer,
      contacts: nameHit ? contacts : matchedContacts,
      openTickets: db().filter((t) => t.customerId === customer.id && isActive(t.status)).length,
    };
  })
    .filter((x) => x !== null)
    .slice(0, 4);
  return { tickets, customers };
}

export interface Lookups {
  agents: Agent[];
  teams: Team[];
  customers: Customer[];
  contacts: Contact[];
  /** Every tag in use plus the suggested set, alphabetical. */
  tags: string[];
  currentAgentId: string;
}

export async function getLookups(): Promise<Lookups> {
  await delay(40);
  const tags = [...new Set([...db().flatMap((t) => t.tags), ...SUGGESTED_TAGS])].sort();
  return { agents: AGENTS, teams: TEAMS, customers: CUSTOMERS, contacts: CONTACTS, tags, currentAgentId: CURRENT_AGENT_ID };
}

// ── Mutations ────────────────────────────────────────────────────────

/** Set only while applying another agent's change (see `applyRemoteChange`). */
let actingAgentId: string | null = null;
const currentAgent = () => agentById.get(actingAgentId ?? CURRENT_AGENT_ID)!;
let seq = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++seq).toString(36)}`;

function log(t: TicketRecord, type: ActivityType, description: string, actor = currentAgent().name) {
  const timestamp = new Date().toISOString();
  t.activities.push({ id: uid("act"), type, description, actor, timestamp });
  t.updatedAt = timestamp;
}

function applyStatus(t: TicketRecord, next: TicketStatus) {
  if (t.status === next) return;
  const prev = t.status;
  const reopening = !isActive(prev) && isActive(next);
  t.status = next;
  if (next === "resolved" || next === "closed") {
    t.sla = { ...t.sla, resolvedAt: t.sla.resolvedAt ?? new Date().toISOString() };
  } else if (reopening) {
    t.sla = { ...t.sla, resolvedAt: null };
  }
  if (reopening) log(t, "reopened", `Ticket reopened (${STATUS_META[prev].label} → ${STATUS_META[next].label})`);
  else log(t, "status_changed", `Status changed from ${STATUS_META[prev].label} to ${STATUS_META[next].label}`);
}

export interface TicketPatch {
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  category?: TicketCategory;
  assigneeId?: string | null;
  teamId?: string;
  addTag?: string;
  removeTag?: string;
  following?: boolean;
  spam?: boolean;
}

export async function updateTicket(id: string, patch: TicketPatch): Promise<Ticket> {
  await delay(140);
  return patchTicket(id, patch);
}

function patchTicket(id: string, patch: TicketPatch): Ticket {
  const t = findRecord(id);

  if (patch.teamId !== undefined && patch.teamId !== t.teamId) {
    const team = teamById.get(patch.teamId);
    if (!team) throw new NotFoundError("Team");
    log(t, "team_changed", `Team changed from ${teamById.get(t.teamId)!.name} to ${team.name}`);
    t.teamId = team.id;
    // An assignee outside the new team no longer owns the ticket — unless they're being reassigned in this same change.
    const nextAssignee = patch.assigneeId !== undefined ? patch.assigneeId : t.assigneeId;
    if (nextAssignee && agentById.get(nextAssignee)?.teamId !== team.id && patch.assigneeId === undefined) {
      t.assigneeId = null;
      log(t, "unassigned", "Unassigned — previous assignee is not in the new team");
    }
  }
  if (patch.assigneeId !== undefined && patch.assigneeId !== t.assigneeId) {
    if (patch.assigneeId === null) {
      t.assigneeId = null;
      log(t, "unassigned", "Ticket unassigned");
    } else {
      const agent = agentById.get(patch.assigneeId);
      if (!agent) throw new NotFoundError("Agent");
      t.assigneeId = agent.id;
      log(t, "assigned", `Assigned to ${agent.name}`);
    }
  }
  if (patch.status) applyStatus(t, patch.status);
  if (patch.priority && patch.priority !== t.priority) {
    log(t, "priority_changed", `Priority changed from ${PRIORITY_META[t.priority].label} to ${PRIORITY_META[patch.priority].label}`);
    t.priority = patch.priority;
  }
  if (patch.type && patch.type !== t.type) {
    log(t, "type_changed", `Type changed from ${TYPE_LABEL[t.type]} to ${TYPE_LABEL[patch.type]}`);
    t.type = patch.type;
  }
  if (patch.category && patch.category !== t.category) {
    log(t, "category_changed", `Category changed from ${CATEGORY_LABEL[t.category]} to ${CATEGORY_LABEL[patch.category]}`);
    t.category = patch.category;
  }
  if (patch.addTag !== undefined) {
    const tag = tagSchema.parse(patch.addTag);
    if (!t.tags.includes(tag)) {
      t.tags = [...t.tags, tag];
      log(t, "tag_added", `Tag "${tag}" added`);
    }
  }
  if (patch.removeTag !== undefined && t.tags.includes(patch.removeTag)) {
    t.tags = t.tags.filter((x) => x !== patch.removeTag);
    log(t, "tag_removed", `Tag "${patch.removeTag}" removed`);
  }
  if (patch.spam !== undefined && patch.spam !== t.spam) {
    t.spam = patch.spam;
    log(t, "marked_spam", patch.spam ? "Marked as spam" : "Removed from spam");
  }
  if (patch.following !== undefined) {
    const me = CURRENT_AGENT_ID;
    t.followerIds = patch.following ? [...new Set([...t.followerIds, me])] : t.followerIds.filter((x) => x !== me);
  }
  return toTicket(t, Date.now());
}

export async function addMessage(
  id: string,
  input: ComposerInput & { setStatus?: TicketStatus },
): Promise<Ticket> {
  const parsed = composerSchema.parse(input);
  await delay(220);
  return appendMessage(id, parsed, input.setStatus);
}

function appendMessage(id: string, parsed: ComposerInput, setStatus?: TicketStatus): Ticket {
  const t = findRecord(id);
  const me = currentAgent();
  const now = new Date().toISOString();
  const attachments: Attachment[] = parsed.attachments.map((a) => ({ ...a, id: uid("file") }));
  t.messages.push({
    id: uid("msg"),
    author: { id: me.id, name: me.name, role: me.role, avatar: me.avatar },
    authorType: "agent",
    body: parsed.body,
    timestamp: now,
    visibility: parsed.visibility,
    channel: t.source === "chat" || t.source === "social" ? t.source : "email",
    attachments,
    mentions: mentionsIn(parsed.body),
  });
  if (parsed.visibility === "public") {
    t.lastReplyAt = now;
    if (!t.sla.firstRespondedAt) t.sla = { ...t.sla, firstRespondedAt: now };
    log(t, "agent_replied", "Public reply sent");
  } else {
    log(t, "note_added", "Internal note added");
  }
  if (setStatus) applyStatus(t, setStatus);
  return toTicket(t, Date.now());
}

/** A change made by another agent — what a real-time server event would carry. */
export type RemoteChange = { patch: TicketPatch } | { message: ComposerInput };

/**
 * Applies another agent's change to the store, attributed to them in the
 * activity log. Mock-only: with a real backend these changes happen on the
 * server and the client just refetches when the presence channel reports them.
 */
export function applyRemoteChange(agentId: string, ticketId: string, change: RemoteChange) {
  if (!agentById.has(agentId)) throw new NotFoundError("Agent");
  actingAgentId = agentId;
  try {
    if ("patch" in change) patchTicket(ticketId, change.patch);
    else appendMessage(ticketId, composerSchema.parse(change.message));
  } finally {
    actingAgentId = null;
  }
}

export async function mergeTicket(primaryId: string, secondaryId: string): Promise<Ticket> {
  await delay(200);
  const primary = findRecord(primaryId);
  const secondary = findRecord(secondaryId);
  if (primary.id === secondary.id) throw new Error("A ticket can't be merged into itself.");
  secondary.mergedIntoId = primary.id;
  applyStatus(secondary, "closed");
  log(secondary, "merged", `Merged into #${primary.ticketNumber}`);
  primary.relatedTicketIds = [...new Set([...primary.relatedTicketIds, secondary.id])];
  primary.messages.push({
    id: uid("msg"),
    author: { id: "system", name: "Desk", role: "System" },
    authorType: "system",
    body: `#${secondary.ticketNumber} "${secondary.subject}" was merged into this ticket. Its ${secondary.messages.length} messages remain available on the original ticket.`,
    timestamp: new Date().toISOString(),
    visibility: "internal",
    channel: "portal",
    attachments: [],
    mentions: [],
  });
  log(primary, "merged", `Merged #${secondary.ticketNumber} into this ticket`);
  return toTicket(primary, Date.now());
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const data = createTicketSchema.parse(input);
  await delay(250);
  const contact = contactById.get(data.contactId);
  if (!contact) throw new NotFoundError("Contact");
  const all = db();
  const nextNumber = Math.max(...all.map((t) => Number(t.ticketNumber.slice(-5)))) + 1;
  const id = ticketNumber(nextNumber);
  const now = Date.now();
  const iso = new Date(now).toISOString();
  const policy = SLA_POLICY[data.priority];
  const me = currentAgent();
  const record: TicketRecord = {
    id,
    ticketNumber: id,
    subject: data.subject,
    description: data.description,
    status: "open",
    priority: data.priority,
    type: data.type,
    category: data.category,
    source: data.source,
    customerId: contact.customerId,
    contactId: contact.id,
    assigneeId: data.assigneeId,
    teamId: data.teamId,
    sla: {
      firstResponseDue: new Date(now + policy.firstResponse * 60_000).toISOString(),
      resolutionDue: new Date(now + policy.resolution * 60_000).toISOString(),
      firstRespondedAt: null,
      resolvedAt: null,
    },
    tags: [],
    spam: false,
    createdAt: iso,
    updatedAt: iso,
    lastReplyAt: iso,
    messages: [
      {
        id: uid("msg"),
        author: { id: contact.id, name: contact.name, role: "Customer", avatar: contact.avatar },
        authorType: "customer",
        body: data.description,
        timestamp: iso,
        visibility: "public",
        channel: data.source,
        attachments: [],
        mentions: [],
      },
    ],
    activities: [
      { id: uid("act"), type: "created", description: `Ticket created by ${me.name} on behalf of ${contact.name}`, actor: me.name, timestamp: iso },
    ],
    relatedTicketIds: [],
    followerIds: [],
  };
  if (data.assigneeId) {
    record.activities.push({
      id: uid("act"),
      type: "assigned",
      description: `Assigned to ${agentById.get(data.assigneeId)?.name ?? "agent"}`,
      actor: me.name,
      timestamp: iso,
    });
  }
  all.unshift(record);
  return toTicket(record, now);
}
