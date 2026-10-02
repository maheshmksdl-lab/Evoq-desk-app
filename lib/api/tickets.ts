/**
 * Mock ticket API. Every function is async and returns plain JSON-shaped
 * data, mirroring what REST endpoints would return. Replacing this module
 * with real fetch calls is the only change needed to connect a backend.
 *
 * State lives in memory for the browser session — nothing is persisted.
 */
import { AGENTS, CURRENT_AGENT_ID, TEAMS } from "@/lib/mock-data/agents";
import { CONTACTS, CUSTOMERS } from "@/lib/mock-data/customers";
import { buildTickets, SLA_POLICY, ticketNumber } from "@/lib/mock-data/tickets";
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
  TicketPriority,
  TicketRecord,
  TicketStatus,
  TicketSummary,
  TicketType,
} from "@/lib/types/ticket";

// ── In-memory store ──────────────────────────────────────────────────

let store: TicketRecord[] | null = null;
const db = () => (store ??= buildTickets(Date.now()));

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

type TicketBase = Omit<TicketSummary, "messageCount" | "awaiting">;

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
  };
}

function toSummary(t: TicketRecord, now: number): TicketSummary {
  const publicMsgs = t.messages.filter((m) => m.visibility === "public");
  const last = publicMsgs[publicMsgs.length - 1];
  return {
    ...toBase(t, now),
    messageCount: publicMsgs.length,
    awaiting: last?.authorType === "agent" ? "customer" : "agent",
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

function matchesView(t: TicketSummary, view: TicketView): boolean {
  switch (view) {
    case "all":
      return true;
    case "mine":
      return t.assignee?.id === CURRENT_AGENT_ID && isActive(t.status);
    case "unassigned":
      return !t.assignee && isActive(t.status);
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
  const rows = db().map((t) => toSummary(t, now));
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
    .filter((t) => matchesSearch(t, term))
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
  currentAgentId: string;
}

export async function getLookups(): Promise<Lookups> {
  await delay(40);
  return { agents: AGENTS, teams: TEAMS, customers: CUSTOMERS, contacts: CONTACTS, currentAgentId: CURRENT_AGENT_ID };
}

// ── Mutations ────────────────────────────────────────────────────────

const currentAgent = () => agentById.get(CURRENT_AGENT_ID)!;
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
}

export async function updateTicket(id: string, patch: TicketPatch): Promise<Ticket> {
  await delay(140);
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
  });
  if (parsed.visibility === "public") {
    t.lastReplyAt = now;
    if (!t.sla.firstRespondedAt) t.sla = { ...t.sla, firstRespondedAt: now };
    log(t, "agent_replied", "Public reply sent");
  } else {
    log(t, "note_added", "Internal note added");
  }
  if (input.setStatus) applyStatus(t, input.setStatus);
  return toTicket(t, Date.now());
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
