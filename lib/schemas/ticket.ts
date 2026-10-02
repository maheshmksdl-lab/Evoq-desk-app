import { z } from "zod";
import {
  SLA_STATES,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_SOURCES,
  TICKET_STATUSES,
  TICKET_TYPES,
} from "@/lib/types/ticket";

// ── Ticket list query (lives in the URL) ─────────────────────────────

export const TICKET_VIEWS = [
  "all",
  "mine",
  "unassigned",
  "team",
  "open",
  "pending",
  "on_hold",
  "resolved",
  "closed",
  "high_priority",
  "sla_at_risk",
  "overdue",
  "recent",
] as const;
export type TicketView = (typeof TICKET_VIEWS)[number];

export const TICKET_SORTS = [
  "updated_desc",
  "updated_asc",
  "created_desc",
  "created_asc",
  "priority_desc",
  "sla_asc",
] as const;
export type TicketSort = (typeof TICKET_SORTS)[number];

export const DATE_RANGES = ["today", "7d", "30d", "90d"] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export const PAGE_SIZES = [10, 25, 50] as const;

/** Comma-separated URL value → array, keeping only known values. */
function csv<const T extends readonly string[]>(values: T) {
  return z.preprocess(
    (v) => (typeof v === "string" && v.length ? v.split(",") : Array.isArray(v) ? v : []),
    z.array(z.string()).transform((arr) => [...new Set(arr)].filter((x): x is T[number] => values.includes(x))),
  );
}
/** Free-form id list (agent / team / customer ids). */
const idList = z.preprocess(
  (v) => (typeof v === "string" && v.length ? v.split(",") : Array.isArray(v) ? v : []),
  z.array(z.string().max(64)).max(50),
);

export const SLA_FILTER_STATES = ["on_track", "at_risk", "breached"] as const satisfies readonly (typeof SLA_STATES)[number][];

export const ticketFiltersSchema = z.object({
  status: csv(TICKET_STATUSES),
  priority: csv(TICKET_PRIORITIES),
  type: csv(TICKET_TYPES),
  category: csv(TICKET_CATEGORIES),
  source: csv(TICKET_SOURCES),
  sla: csv(SLA_FILTER_STATES),
  /** Agent ids, plus "unassigned". */
  assignee: idList,
  team: idList,
  customer: idList,
  /** Tag names; a ticket matches when it carries any of them. */
  tags: idList,
  /** Spam is hidden everywhere unless asked for explicitly. */
  spam: z.enum(["only"]).optional().catch(undefined),
  created: z.enum(DATE_RANGES).optional().catch(undefined),
  updated: z.enum(DATE_RANGES).optional().catch(undefined),
});
export type TicketFilters = z.infer<typeof ticketFiltersSchema>;

export const ticketQuerySchema = ticketFiltersSchema.extend({
  view: z.enum(TICKET_VIEWS).catch("all"),
  q: z.string().trim().max(120).catch(""),
  sort: z.enum(TICKET_SORTS).catch("updated_desc"),
  /** Ticket shown in the side panel next to the list (wide screens). */
  open: z.string().trim().max(64).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  size: z.coerce
    .number()
    .refine((n): n is (typeof PAGE_SIZES)[number] => (PAGE_SIZES as readonly number[]).includes(n))
    .catch(25),
});
export type TicketQuery = z.infer<typeof ticketQuerySchema>;

export const FILTER_KEYS = [
  "status",
  "priority",
  "type",
  "category",
  "assignee",
  "team",
  "customer",
  "source",
  "created",
  "updated",
  "sla",
  "tags",
  "spam",
] as const satisfies readonly (keyof TicketFilters)[];
export type FilterKey = (typeof FILTER_KEYS)[number];

export const EMPTY_FILTERS: TicketFilters = ticketFiltersSchema.parse({});

export function parseTicketQuery(params: URLSearchParams): TicketQuery {
  return ticketQuerySchema.parse(Object.fromEntries(params.entries()));
}

export function countActiveFilters(filters: TicketFilters): number {
  return FILTER_KEYS.reduce((n, key) => {
    const v = filters[key];
    return n + (Array.isArray(v) ? (v.length ? 1 : 0) : v ? 1 : 0);
  }, 0);
}

// ── Composer ─────────────────────────────────────────────────────────

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export const attachmentDraftSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES, "Attachments must be 20 MB or smaller."),
  mimeType: z.string(),
});

const messageBody = z
  .string()
  .trim()
  .min(1, "Write a message before sending.")
  .max(10_000, "Messages are limited to 10,000 characters.");

export const replySchema = z.object({
  visibility: z.literal("public"),
  body: messageBody,
  attachments: z.array(attachmentDraftSchema).max(10, "Attach up to 10 files."),
});

export const internalNoteSchema = z.object({
  visibility: z.literal("internal"),
  body: messageBody,
  attachments: z.array(attachmentDraftSchema).max(10, "Attach up to 10 files."),
});

export const composerSchema = z.discriminatedUnion("visibility", [replySchema, internalNoteSchema]);
export type ComposerInput = z.infer<typeof composerSchema>;

// ── Tags ─────────────────────────────────────────────────────────────

export const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Tags need at least 2 characters.")
  .max(30, "Tags are limited to 30 characters.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.");

// ── New ticket ───────────────────────────────────────────────────────

export const createTicketSchema = z.object({
  contactId: z.string().min(1, "Choose a requester."),
  subject: z.string().trim().min(5, "Subject needs at least 5 characters.").max(150, "Keep the subject under 150 characters."),
  description: z.string().trim().min(10, "Describe the issue in at least 10 characters.").max(10_000),
  priority: z.enum(TICKET_PRIORITIES),
  type: z.enum(TICKET_TYPES),
  category: z.enum(TICKET_CATEGORIES),
  source: z.enum(TICKET_SOURCES),
  teamId: z.string().min(1, "Choose a team."),
  assigneeId: z.string().nullable(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
