import { z } from "zod";
import { ARTICLE_STATUSES, KNOWLEDGE_CATEGORIES } from "@/lib/mock-data/knowledge";
import { AGENT_ROLES, AGENT_STATUSES, CUSTOMER_STATUSES, CUSTOMER_TYPES } from "@/lib/types/ticket";

/**
 * Form schemas for the Desk modules beyond tickets (Customers, Knowledge,
 * Settings). Each drawer validates with these, and the mock API parses them
 * again — the contract a real endpoint would enforce.
 */

const phone = z
  .string()
  .trim()
  .max(30, "Keep the phone number under 30 characters.")
  .regex(/^[+\d\s().-]*$/, "Use digits, spaces and + ( ) - only.");

export const CUSTOMER_PLANS = ["Starter", "Growth", "Professional", "Enterprise"] as const;

export const customerInputSchema = z.object({
  name: z.string().trim().min(2, "Name needs at least 2 characters.").max(80, "Keep the name under 80 characters."),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(/^([a-z0-9-]+\.)+[a-z0-9-]{2,}$|^$/, "Enter a domain like acme.com, or leave it empty."),
  phone,
  type: z.enum(CUSTOMER_TYPES),
  status: z.enum(CUSTOMER_STATUSES),
  plan: z.enum(CUSTOMER_PLANS),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;

export const contactInputSchema = z.object({
  customerId: z.string().min(1, "Choose a customer."),
  name: z.string().trim().min(2, "Name needs at least 2 characters.").max(80, "Keep the name under 80 characters."),
  title: z.string().trim().max(80, "Keep the job title under 80 characters."),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  phone,
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const customerNoteSchema = z.object({
  body: z.string().trim().min(3, "Write at least 3 characters.").max(2_000, "Keep notes under 2,000 characters."),
});

export const articleInputSchema = z.object({
  title: z.string().trim().min(5, "Title needs at least 5 characters.").max(120, "Keep the title under 120 characters."),
  summary: z.string().trim().min(10, "Summary needs at least 10 characters.").max(200, "Keep the summary under 200 characters."),
  body: z.string().trim().min(30, "Write at least 30 characters.").max(10_000),
  category: z.enum(KNOWLEDGE_CATEGORIES),
  status: z.enum(ARTICLE_STATUSES),
  /** Comma-separated in the form; words that make the article show up as a suggestion. */
  keywords: z.array(z.string().trim().toLowerCase().min(2).max(30)).max(20, "Use at most 20 keywords."),
});
export type ArticleInput = z.infer<typeof articleInputSchema>;

export const TIMEZONES = ["America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Singapore", "Australia/Sydney"] as const;

export const profileInputSchema = z.object({
  status: z.enum(AGENT_STATUSES),
  timezone: z.enum(TIMEZONES),
  signature: z.string().trim().max(500, "Keep the signature under 500 characters."),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

export const agentEditSchema = z.object({
  teamId: z.string().min(1, "Choose a team."),
  role: z.enum(AGENT_ROLES),
});
export type AgentEdit = z.infer<typeof agentEditSchema>;

/** Minutes. First response from 5 minutes to 3 days; resolution up to 30 days, never shorter than first response. */
export const slaPolicySchema = z
  .object({
    firstResponse: z.number().int().min(5, "At least 5 minutes.").max(3 * 24 * 60, "At most 3 days."),
    resolution: z.number().int().min(15, "At least 15 minutes.").max(30 * 24 * 60, "At most 30 days."),
  })
  .refine((p) => p.resolution > p.firstResponse, { message: "Resolution must be longer than first response.", path: ["resolution"] });
export type SlaPolicy = z.infer<typeof slaPolicySchema>;
