import type { z } from "zod";
import type {
  agentPresenceSchema,
  agentSchema,
  attachmentSchema,
  automationRuleSchema,
  contactSchema,
  customerSchema,
  messageAuthorSchema,
  savedReplySchema,
  teamSchema,
  ticketActivitySchema,
  ticketMessageSchema,
  ticketPresenceSchema,
  ticketRecordSchema,
  ticketSlaSchema,
} from "@/lib/schemas/entities";

/**
 * Desk domain types. Ticket, Customer, Contact and Agent are separate
 * records joined by id — the mock API resolves them the way a real
 * backend would, so UI components never reach into raw mock data.
 * Record shapes are inferred from the Zod schemas in `lib/schemas/entities.ts`.
 */

export const TICKET_STATUSES = ["open", "pending", "on_hold", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_TYPES = ["question", "incident", "problem", "feature_request", "task"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const TICKET_CATEGORIES = [
  "account",
  "billing",
  "technical",
  "reporting",
  "product",
  "security",
  "integration",
  "general",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_SOURCES = ["email", "web_form", "chat", "phone", "portal", "api", "social"] as const;
export type TicketSource = (typeof TICKET_SOURCES)[number];

/** On track / at risk / breached while a clock runs; met once it stops in time; paused while waiting on the customer. */
export const SLA_STATES = ["on_track", "at_risk", "breached", "met", "paused"] as const;
export type SlaState = (typeof SLA_STATES)[number];

export const CUSTOMER_TYPES = ["Enterprise", "Business", "Individual"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

/** Account health as support sees it. */
export const CUSTOMER_STATUSES = ["active", "at_risk", "inactive"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const AGENT_ROLES = ["Support Agent", "Senior Support Agent", "Team Lead", "Support Manager"] as const;
export const AGENT_STATUSES = ["available", "busy", "away"] as const;

export const ACTIVITY_TYPES = [
  "created",
  "assigned",
  "unassigned",
  "team_changed",
  "status_changed",
  "priority_changed",
  "type_changed",
  "category_changed",
  "customer_replied",
  "agent_replied",
  "note_added",
  "tag_added",
  "tag_removed",
  "reopened",
  "merged",
  "sla_breached",
  "marked_spam",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type Team = z.infer<typeof teamSchema>;
export type Agent = z.infer<typeof agentSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;

export type MessageAuthorType = TicketMessage["authorType"];
export type MessageVisibility = TicketMessage["visibility"];
export type MessageAuthor = z.infer<typeof messageAuthorSchema>;
export type TicketMessage = z.infer<typeof ticketMessageSchema>;
export type TicketActivity = z.infer<typeof ticketActivitySchema>;
export type TicketSla = z.infer<typeof ticketSlaSchema>;

/** SLA with states evaluated at read time (the "server" computes these). */
export interface TicketSlaView extends TicketSla {
  firstResponseStatus: SlaState;
  resolutionStatus: SlaState;
}

/** Stored ticket record — references other records by id. */
export type TicketRecord = z.infer<typeof ticketRecordSchema>;

export type AgentPresence = z.infer<typeof agentPresenceSchema>;
export type TicketPresence = z.infer<typeof ticketPresenceSchema>;
export type SavedReply = z.infer<typeof savedReplySchema>;
export type AutomationRule = z.infer<typeof automationRuleSchema>;

export interface RelatedTicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
}

/** Row shape returned by the ticket list. */
export interface TicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  category: TicketCategory;
  source: TicketSource;
  customer: Customer;
  contact: Contact;
  assignee: Agent | null;
  team: Team;
  sla: TicketSlaView;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastReplyAt: string;
  messageCount: number;
  /** Who spoke last on the public thread — tells agents whose turn it is. */
  awaiting: "agent" | "customer";
  /** One-line excerpt of the latest public message, for list rows. */
  preview: string;
  /** Marked as spam — hidden from views unless the spam filter is on. */
  spam: boolean;
}

export interface CustomerContext {
  customer: Customer;
  contact: Contact;
  openTickets: number;
  totalTickets: number;
  recentTickets: RelatedTicketSummary[];
}

/** Full ticket shape returned by the detail endpoint. */
export interface Ticket extends Omit<TicketSummary, "messageCount" | "awaiting" | "preview"> {
  description: string;
  messages: TicketMessage[];
  activities: TicketActivity[];
  attachments: Attachment[];
  relatedTickets: RelatedTicketSummary[];
  customerContext: CustomerContext;
  followers: Agent[];
  mergedInto: RelatedTicketSummary | null;
}
