/**
 * Mock automations API. Rules are stored in memory and validated with the
 * shared schema. Matching runs against the live ticket store, and "Run now"
 * applies a rule's actions through the same update path agents use, so every
 * change lands in the ticket's activity log.
 */
import { AGENTS, TEAMS } from "@/lib/mock-data/agents";
import { CUSTOMERS } from "@/lib/mock-data/customers";
import { NotFoundError, ticketRows, updateTicket, type TicketPatch } from "@/lib/api/tickets";
import { automationRuleSchema, RULE_ACTIONS, RULE_OPERATORS, RULE_TRIGGERS } from "@/lib/schemas/entities";
import { focusClock } from "@/lib/sla";
import { ACTIVE_STATUSES, CATEGORY_LABEL, PRIORITY_META, SOURCE_LABEL, STATUS_META } from "@/lib/ticket-meta";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_SOURCES,
  TICKET_STATUSES,
  type AutomationRule,
  type TicketPriority,
  type TicketStatus,
  type TicketSummary,
} from "@/lib/types/ticket";

const delay = (ms = 90 + Math.random() * 120) => new Promise((r) => setTimeout(r, ms));
let seq = 0;
const uid = () => `rule-${Date.now().toString(36)}-${(++seq).toString(36)}`;

export type RuleTrigger = (typeof RULE_TRIGGERS)[number];
export type RuleOperator = (typeof RULE_OPERATORS)[number];
export type RuleActionType = (typeof RULE_ACTIONS)[number];

export const TRIGGER_LABEL: Record<RuleTrigger, string> = {
  ticket_created: "When a ticket is created",
  ticket_updated: "When a ticket is updated",
  customer_replied: "When a customer replies",
  sla_warning: "When an SLA is at risk",
};
export const OPERATOR_LABEL: Record<RuleOperator, string> = { is: "is", is_not: "is not", contains: "contains" };
export const ACTION_LABEL: Record<RuleActionType, string> = {
  assign_agent: "Assign to agent",
  assign_team: "Move to team",
  set_priority: "Set priority",
  set_status: "Set status",
  add_tag: "Add tag",
  notify: "Notify agent",
};

/** Ticket fields a condition can test, with the values it can compare against (free text when there's no list). */
type Option = { value: string; label: string };
export type ConditionField = "priority" | "status" | "category" | "source" | "team" | "customer" | "subject" | "tag" | "assignee";

export const CONDITION_FIELDS: Record<ConditionField, { label: string; options: Option[] | null }> = {
  priority: { label: "Priority", options: TICKET_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label })) },
  status: { label: "Status", options: TICKET_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label })) },
  category: { label: "Category", options: TICKET_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] })) },
  source: { label: "Channel", options: TICKET_SOURCES.map((s) => ({ value: s, label: SOURCE_LABEL[s] })) },
  team: { label: "Team", options: TEAMS.map((t) => ({ value: t.id, label: t.name })) },
  customer: { label: "Customer", options: null },
  subject: { label: "Subject", options: null },
  tag: { label: "Tag", options: null },
  assignee: { label: "Assignee", options: [{ value: "unassigned", label: "Unassigned" }, ...AGENTS.map((a) => ({ value: a.id, label: a.name }))] },
};

/** Customer options are read lazily so customers added this session appear. */
export function conditionOptions(field: ConditionField): { value: string; label: string }[] | null {
  if (field === "customer") return CUSTOMERS.map((c) => ({ value: c.id, label: c.name }));
  return CONDITION_FIELDS[field].options;
}

export function actionOptions(type: RuleActionType): { value: string; label: string }[] | null {
  switch (type) {
    case "assign_agent":
    case "notify":
      return AGENTS.map((a) => ({ value: a.id, label: a.name }));
    case "assign_team":
      return TEAMS.map((t) => ({ value: t.id, label: t.name }));
    case "set_priority":
      return TICKET_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }));
    case "set_status":
      return TICKET_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }));
    case "add_tag":
      return null;
  }
}

/** "Priority is Urgent" — human label for a stored value. */
export function valueLabel(options: { value: string; label: string }[] | null, value: string) {
  return options?.find((o) => o.value === value)?.label ?? value;
}

// ── Store ────────────────────────────────────────────────────────────

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

function seed(): AutomationRule[] {
  const rules: AutomationRule[] = [
    {
      id: "rule-urgent-billing",
      name: "Route urgent billing issues",
      description: "Urgent billing tickets go straight to Billing Support and get the escalation tag.",
      enabled: true,
      trigger: "ticket_created",
      conditions: [
        { field: "category", operator: "is", value: "billing" },
        { field: "priority", operator: "is", value: "urgent" },
      ],
      actions: [
        { type: "assign_team", value: "team-billing" },
        { type: "add_tag", value: "escalated" },
      ],
      executions: 64,
      lastExecutedAt: ago(42),
      updatedAt: ago(9 * 24 * 60),
    },
    {
      id: "rule-security",
      name: "Flag security reports",
      description: "Anything mentioning a breach or vulnerability is raised to Urgent and the team lead is notified.",
      enabled: true,
      trigger: "ticket_created",
      conditions: [{ field: "category", operator: "is", value: "security" }],
      actions: [
        { type: "set_priority", value: "urgent" },
        { type: "notify", value: "agt-alex" },
      ],
      executions: 11,
      lastExecutedAt: ago(3 * 24 * 60),
      updatedAt: ago(30 * 24 * 60),
    },
    {
      id: "rule-sla-risk",
      name: "Escalate SLA risks",
      description: "When a first response is about to be missed, raise the priority so it moves up every queue.",
      enabled: true,
      trigger: "sla_warning",
      conditions: [{ field: "priority", operator: "is_not", value: "urgent" }],
      actions: [{ type: "set_priority", value: "high" }],
      executions: 128,
      lastExecutedAt: ago(18),
      updatedAt: ago(14 * 24 * 60),
    },
    {
      id: "rule-reopen",
      name: "Reopen on customer reply",
      description: "A reply on a pending ticket puts it back in the Open queue.",
      enabled: true,
      trigger: "customer_replied",
      conditions: [{ field: "status", operator: "is", value: "pending" }],
      actions: [{ type: "set_status", value: "open" }],
      executions: 342,
      lastExecutedAt: ago(7),
      updatedAt: ago(60 * 24 * 60),
    },
    {
      id: "rule-integrations",
      name: "Integrations to Product Support",
      description: "API and integration questions are handled by Product Support.",
      enabled: true,
      trigger: "ticket_created",
      conditions: [{ field: "category", operator: "is", value: "integration" }],
      actions: [{ type: "assign_team", value: "team-integrations" }],
      executions: 37,
      lastExecutedAt: ago(5 * 60),
      updatedAt: ago(21 * 24 * 60),
    },
    {
      id: "rule-vip-chat",
      name: "Tag Enterprise chats",
      description: "Chats from Northstar Retail get the vip tag so they're easy to spot.",
      enabled: false,
      trigger: "ticket_created",
      conditions: [
        { field: "customer", operator: "is", value: "cus-northstar" },
        { field: "source", operator: "is", value: "chat" },
      ],
      actions: [{ type: "add_tag", value: "vip" }],
      executions: 4,
      lastExecutedAt: ago(40 * 24 * 60),
      updatedAt: ago(45 * 24 * 60),
    },
  ];
  if (process.env.NODE_ENV !== "production") automationRuleSchema.array().parse(rules);
  return rules;
}

let store: AutomationRule[] | null = null;
const db = () => (store ??= seed());

// ── Matching ─────────────────────────────────────────────────────────

function fieldValues(t: TicketSummary, field: string): string[] {
  switch (field) {
    case "priority":
      return [t.priority];
    case "status":
      return [t.status];
    case "category":
      return [t.category];
    case "source":
      return [t.source];
    case "team":
      return [t.team.id];
    case "customer":
      return [t.customer.id];
    case "assignee":
      return [t.assignee?.id ?? "unassigned"];
    case "subject":
      return [t.subject.toLowerCase()];
    case "tag":
      return t.tags;
    default:
      return [];
  }
}

function matches(t: TicketSummary, rule: Pick<AutomationRule, "conditions" | "trigger">): boolean {
  if (!ACTIVE_STATUSES.includes(t.status)) return false;
  if (rule.trigger === "sla_warning" && focusClock(t.sla).state !== "at_risk") return false;
  if (rule.trigger === "customer_replied" && t.awaiting !== "agent") return false;
  return rule.conditions.every(({ field, operator, value }) => {
    const values = fieldValues(t, field);
    const v = value.toLowerCase();
    if (operator === "contains") return values.some((x) => x.toLowerCase().includes(v));
    const hit = values.some((x) => x.toLowerCase() === v);
    return operator === "is" ? hit : !hit;
  });
}

/** Open tickets a rule would act on right now. */
export async function previewRule(rule: Pick<AutomationRule, "conditions" | "trigger">): Promise<TicketSummary[]> {
  await delay(60);
  return ticketRows().filter((t) => matches(t, rule));
}

// ── CRUD ─────────────────────────────────────────────────────────────

export interface RuleView extends AutomationRule {
  matching: number;
}

export async function listRules(): Promise<RuleView[]> {
  await delay();
  const rows = ticketRows();
  return [...db()].sort((a, b) => Number(b.enabled) - Number(a.enabled) || b.updatedAt.localeCompare(a.updatedAt)).map((r) => ({ ...r, matching: rows.filter((t) => matches(t, r)).length }));
}

export type RuleInput = Pick<AutomationRule, "name" | "description" | "enabled" | "trigger" | "conditions" | "actions">;

export async function saveRule(input: RuleInput, id?: string): Promise<AutomationRule> {
  await delay(180);
  const now = new Date().toISOString();
  const existing = id ? db().find((r) => r.id === id) : undefined;
  if (id && !existing) throw new NotFoundError("Rule");
  const rule = automationRuleSchema.parse({
    executions: 0,
    lastExecutedAt: null,
    ...existing,
    ...input,
    id: existing?.id ?? uid(),
    updatedAt: now,
  });
  if (existing) Object.assign(existing, rule);
  else db().unshift(rule);
  return rule;
}

export async function setRuleEnabled(id: string, enabled: boolean): Promise<void> {
  await delay(100);
  const rule = db().find((r) => r.id === id);
  if (!rule) throw new NotFoundError("Rule");
  rule.enabled = enabled;
  rule.updatedAt = new Date().toISOString();
}

export async function deleteRule(id: string): Promise<void> {
  await delay(120);
  store = db().filter((r) => r.id !== id);
}

function toPatch(actions: AutomationRule["actions"]): { patch: TicketPatch; tags: string[] } {
  const patch: TicketPatch = {};
  const tags: string[] = [];
  for (const a of actions) {
    if (a.type === "assign_agent") {
      patch.assigneeId = a.value;
      // An agent from another team brings the ticket to their team.
      const agent = AGENTS.find((x) => x.id === a.value);
      if (agent && !actions.some((x) => x.type === "assign_team")) patch.teamId = agent.teamId;
    }
    if (a.type === "assign_team") patch.teamId = a.value;
    if (a.type === "set_priority") patch.priority = a.value as TicketPriority;
    if (a.type === "set_status") patch.status = a.value as TicketStatus;
    if (a.type === "add_tag") tags.push(a.value);
  }
  return { patch, tags };
}

/** Applies a rule to every open ticket it matches now. Returns how many tickets were changed. */
export async function runRule(id: string): Promise<{ applied: number; notified: string[] }> {
  const rule = db().find((r) => r.id === id);
  if (!rule) throw new NotFoundError("Rule");
  const targets = ticketRows().filter((t) => matches(t, rule));
  const { patch, tags } = toPatch(rule.actions);
  for (const t of targets) {
    if (Object.keys(patch).length) await updateTicket(t.id, patch);
    for (const tag of tags) await updateTicket(t.id, { addTag: tag });
  }
  if (targets.length) {
    rule.executions += targets.length;
    rule.lastExecutedAt = new Date().toISOString();
  }
  const notified = rule.actions.filter((a) => a.type === "notify").map((a) => AGENTS.find((x) => x.id === a.value)?.name ?? a.value);
  return { applied: targets.length, notified };
}
