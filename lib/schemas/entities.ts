import { z } from "zod";
import {
  ACTIVITY_TYPES,
  AGENT_ROLES,
  AGENT_STATUSES,
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_SOURCES,
  TICKET_STATUSES,
  TICKET_TYPES,
} from "@/lib/types/ticket";

/**
 * Domain record schemas. The TypeScript types in `lib/types/ticket.ts` are
 * inferred from these, and the mock store is validated against them in
 * development — the same contract a real API response will have to meet.
 */

const id = z.string().min(1).max(64);
const isoDate = z.iso.datetime({ offset: true });

export const teamSchema = z.object({ id, name: z.string().min(1) });

export const agentSchema = z.object({
  id,
  name: z.string().min(1),
  email: z.email(),
  role: z.enum(AGENT_ROLES),
  teamId: id,
  status: z.enum(AGENT_STATUSES),
  /** Profile image URL; empty when the agent has no photo (initials are shown). */
  avatar: z.string(),
});

export const customerSchema = z.object({
  id,
  name: z.string().min(1),
  domain: z.string(),
  phone: z.string(),
  type: z.enum(CUSTOMER_TYPES),
  status: z.enum(CUSTOMER_STATUSES),
  plan: z.string(),
  customerSince: z.iso.date(),
});

export const contactSchema = z.object({
  id,
  customerId: id,
  name: z.string().min(1),
  title: z.string(),
  email: z.email(),
  phone: z.string(),
  avatar: z.string(),
});

export const attachmentSchema = z.object({
  id,
  name: z.string().min(1).max(255),
  /** Bytes. */
  size: z.number().int().nonnegative(),
  mimeType: z.string(),
});

export const messageAuthorSchema = z.object({
  id,
  name: z.string().min(1),
  /** e.g. "Customer", "Support Agent". */
  role: z.string(),
  avatar: z.string().optional(),
});

export const ticketMessageSchema = z.object({
  id,
  author: messageAuthorSchema,
  authorType: z.enum(["customer", "agent", "system"]),
  body: z.string(),
  timestamp: isoDate,
  visibility: z.enum(["public", "internal"]),
  channel: z.enum(TICKET_SOURCES),
  attachments: z.array(attachmentSchema),
  /** Agent or team ids @mentioned in the body. */
  mentions: z.array(id),
});

export const ticketActivitySchema = z.object({
  id,
  type: z.enum(ACTIVITY_TYPES),
  description: z.string(),
  actor: z.string(),
  timestamp: isoDate,
});

export const ticketSlaSchema = z.object({
  firstResponseDue: isoDate,
  resolutionDue: isoDate,
  firstRespondedAt: isoDate.nullable(),
  resolvedAt: isoDate.nullable(),
});

/** Stored ticket record — references other records by id. */
export const ticketRecordSchema = z.object({
  id,
  ticketNumber: z.string().min(1),
  subject: z.string().min(1),
  description: z.string(),
  status: z.enum(TICKET_STATUSES),
  priority: z.enum(TICKET_PRIORITIES),
  type: z.enum(TICKET_TYPES),
  category: z.enum(TICKET_CATEGORIES),
  source: z.enum(TICKET_SOURCES),
  customerId: id,
  contactId: id,
  assigneeId: id.nullable(),
  teamId: id,
  sla: ticketSlaSchema,
  tags: z.array(z.string()),
  /** Marked as spam: hidden from every view unless the spam filter asks for it. */
  spam: z.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate,
  lastReplyAt: isoDate,
  messages: z.array(ticketMessageSchema),
  activities: z.array(ticketActivitySchema),
  relatedTicketIds: z.array(id),
  followerIds: z.array(id),
  mergedIntoId: id.optional(),
});

// ── Collision awareness ──────────────────────────────────────────────

/** One agent's presence on a ticket. `typing` says what they are composing, if anything. */
export const agentPresenceSchema = z.object({
  agentId: id,
  ticketId: id,
  state: z.enum(["viewing", "idle"]),
  typing: z.enum(["reply", "note"]).nullable(),
  lastSeen: isoDate,
});

/**
 * Everyone else on a ticket right now. Recent changes by other agents
 * ("Alex updated priority to High") come from the ticket's activity log, so
 * presence and history can never disagree.
 */
export const ticketPresenceSchema = z.object({
  ticketId: id,
  agents: z.array(agentPresenceSchema),
});

// ── Saved replies ────────────────────────────────────────────────────

export const SAVED_REPLY_CATEGORIES = ["Billing", "Account", "General", "Escalation", "Resolution"] as const;

export const savedReplySchema = z.object({
  id,
  name: z.string().trim().min(3, "Name needs at least 3 characters.").max(60, "Keep the name under 60 characters."),
  /** Composer slash command, e.g. "/refund". */
  shortcut: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^\/[a-z0-9]+(?:-[a-z0-9]+)*$/, "Start with / and use lowercase letters, numbers and hyphens."),
  category: z.enum(SAVED_REPLY_CATEGORIES),
  body: z.string().trim().min(10, "Write at least 10 characters.").max(5_000),
  usageCount: z.number().int().nonnegative(),
  updatedAt: isoDate,
});

// ── Automation ───────────────────────────────────────────────────────

export const RULE_TRIGGERS = ["ticket_created", "ticket_updated", "customer_replied", "sla_warning"] as const;
export const RULE_OPERATORS = ["is", "is_not", "contains"] as const;
export const RULE_ACTIONS = ["assign_agent", "assign_team", "set_priority", "set_status", "add_tag", "notify"] as const;

export const automationRuleSchema = z.object({
  id,
  name: z.string().trim().min(3).max(80),
  description: z.string().max(240),
  enabled: z.boolean(),
  trigger: z.enum(RULE_TRIGGERS),
  conditions: z.array(z.object({ field: z.string().min(1), operator: z.enum(RULE_OPERATORS), value: z.string().min(1) })).min(1),
  actions: z.array(z.object({ type: z.enum(RULE_ACTIONS), value: z.string().min(1) })).min(1),
  executions: z.number().int().nonnegative(),
  lastExecutedAt: isoDate.nullable(),
  updatedAt: isoDate,
});
