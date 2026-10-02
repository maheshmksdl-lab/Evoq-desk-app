/**
 * Desk domain types. Ticket, Customer, Contact and Agent are separate
 * records joined by id — the mock API resolves them the way a real
 * backend would, so UI components never reach into raw mock data.
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

export type CustomerType = "Enterprise" | "Business" | "Individual";

export interface Team {
  id: string;
  name: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: "Support Agent" | "Senior Support Agent" | "Team Lead" | "Support Manager";
  teamId: string;
  status: "available" | "busy" | "away";
  /** Profile image URL. */
  avatar: string;
}

export interface Customer {
  id: string;
  name: string;
  domain: string;
  phone: string;
  type: CustomerType;
  plan: string;
  customerSince: string;
}

export interface Contact {
  id: string;
  customerId: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  /** Profile image URL. */
  avatar: string;
}

export interface Attachment {
  id: string;
  name: string;
  /** Bytes. */
  size: number;
  mimeType: string;
}

export type MessageAuthorType = "customer" | "agent" | "system";
export type MessageVisibility = "public" | "internal";

export interface MessageAuthor {
  id: string;
  name: string;
  /** e.g. "Customer", "Support Agent". */
  role: string;
  /** Profile image URL; absent for system messages. */
  avatar?: string;
}

export interface TicketMessage {
  id: string;
  author: MessageAuthor;
  authorType: MessageAuthorType;
  body: string;
  timestamp: string;
  visibility: MessageVisibility;
  channel: TicketSource;
  attachments: Attachment[];
}

export type ActivityType =
  | "created"
  | "assigned"
  | "unassigned"
  | "team_changed"
  | "status_changed"
  | "priority_changed"
  | "type_changed"
  | "category_changed"
  | "customer_replied"
  | "agent_replied"
  | "note_added"
  | "tag_added"
  | "tag_removed"
  | "reopened"
  | "merged"
  | "sla_breached";

export interface TicketActivity {
  id: string;
  type: ActivityType;
  description: string;
  actor: string;
  timestamp: string;
}

export interface TicketSla {
  firstResponseDue: string;
  resolutionDue: string;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
}

/** SLA with states evaluated at read time (the "server" computes these). */
export interface TicketSlaView extends TicketSla {
  firstResponseStatus: SlaState;
  resolutionStatus: SlaState;
}

/** Stored ticket record — references other records by id. */
export interface TicketRecord {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  category: TicketCategory;
  source: TicketSource;
  customerId: string;
  contactId: string;
  assigneeId: string | null;
  teamId: string;
  sla: TicketSla;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastReplyAt: string;
  messages: TicketMessage[];
  activities: TicketActivity[];
  relatedTicketIds: string[];
  followerIds: string[];
  mergedIntoId?: string;
}

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
