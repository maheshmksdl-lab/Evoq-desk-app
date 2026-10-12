/**
 * Mock customers API — accounts, their contacts and notes. Ticket figures
 * come from the same in-memory ticket store the Inbox writes to, so an
 * assignment or resolution there is reflected here on the next read.
 */
import { CONTACTS, CUSTOMERS } from "@/lib/mock-data/customers";
import { AGENTS, CURRENT_AGENT_ID } from "@/lib/mock-data/agents";
import { registerContact, registerCustomer, ticketRows, NotFoundError } from "@/lib/api/tickets";
import {
  contactInputSchema,
  customerInputSchema,
  customerNoteSchema,
  type ContactInput,
  type CustomerInput,
} from "@/lib/schemas/desk";
import { focusClock } from "@/lib/sla";
import { ACTIVE_STATUSES } from "@/lib/ticket-meta";
import type { Agent, Contact, Customer, CustomerStatus, CustomerType, TicketSummary } from "@/lib/types/ticket";

const delay = (ms = 100 + Math.random() * 150) => new Promise((r) => setTimeout(r, ms));
let seq = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++seq).toString(36)}`;
const isActive = (t: TicketSummary) => ACTIVE_STATUSES.includes(t.status);

// ── Notes ────────────────────────────────────────────────────────────

export interface CustomerNote {
  id: string;
  body: string;
  author: Agent;
  createdAt: string;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const agent = (id: string) => AGENTS.find((a) => a.id === id)!;

let notes: Map<string, CustomerNote[]> | null = null;
const noteStore = () =>
  (notes ??= new Map([
    [
      "cus-bluepeak",
      [
        { id: "cn-1", body: "Renewal due in November. Two open import issues are the main risk — keep Olivia (CSM) in the loop on anything escalated.", author: agent("agt-olivia"), createdAt: hoursAgo(26) },
      ],
    ],
    [
      "cus-cedar",
      [{ id: "cn-2", body: "Finance team prefers phone follow-ups for billing questions. Invoices go to the controller, James Wilson.", author: agent("agt-emily"), createdAt: hoursAgo(70) }],
    ],
    [
      "cus-vertex",
      [{ id: "cn-3", body: "HIPAA-regulated. Never ask for patient data in tickets; audit log requests go through the security team.", author: agent("agt-alex"), createdAt: hoursAgo(240) }],
    ],
  ]));

// ── Listing ──────────────────────────────────────────────────────────

export const CUSTOMER_SORTS = ["name_asc", "open_desc", "recent_desc", "since_desc"] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

export interface CustomerQuery {
  q: string;
  type: CustomerType | "";
  status: CustomerStatus | "";
  plan: string;
  sort: CustomerSort;
  page: number;
  size: number;
}

export interface CustomerRow {
  customer: Customer;
  contacts: Contact[];
  openTickets: number;
  totalTickets: number;
  /** Open tickets whose SLA is at risk or breached. */
  slaRisk: number;
  lastActivity: string | null;
}

export interface CustomerList {
  items: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  /** Across every customer, unfiltered — for the KPI tiles. */
  stats: { total: number; active: number; atRisk: number; openTickets: number };
}

function toRow(customer: Customer, tickets: TicketSummary[]): CustomerRow {
  const mine = tickets.filter((t) => t.customer.id === customer.id);
  const open = mine.filter(isActive);
  return {
    customer,
    contacts: CONTACTS.filter((c) => c.customerId === customer.id),
    openTickets: open.length,
    totalTickets: mine.length,
    slaRisk: open.filter((t) => ["at_risk", "breached"].includes(focusClock(t.sla).state)).length,
    lastActivity: mine.reduce<string | null>((max, t) => (!max || t.updatedAt > max ? t.updatedAt : max), null),
  };
}

const SORTERS: Record<CustomerSort, (a: CustomerRow, b: CustomerRow) => number> = {
  name_asc: (a, b) => a.customer.name.localeCompare(b.customer.name),
  open_desc: (a, b) => b.openTickets - a.openTickets || a.customer.name.localeCompare(b.customer.name),
  recent_desc: (a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""),
  since_desc: (a, b) => b.customer.customerSince.localeCompare(a.customer.customerSince),
};

export async function listCustomers(query: CustomerQuery): Promise<CustomerList> {
  await delay();
  const tickets = ticketRows();
  const all = CUSTOMERS.map((c) => toRow(c, tickets));
  const term = query.q.trim().toLowerCase();
  const rows = all
    .filter(
      (r) =>
        !term ||
        [r.customer.name, r.customer.domain, r.customer.phone, ...r.contacts.flatMap((c) => [c.name, c.email])].join(" ").toLowerCase().includes(term),
    )
    .filter((r) => !query.type || r.customer.type === query.type)
    .filter((r) => !query.status || r.customer.status === query.status)
    .filter((r) => !query.plan || r.customer.plan === query.plan)
    .sort(SORTERS[query.sort]);
  const pageCount = Math.max(1, Math.ceil(rows.length / query.size));
  const page = Math.min(query.page, pageCount);
  return {
    items: rows.slice((page - 1) * query.size, page * query.size),
    total: rows.length,
    page,
    pageSize: query.size,
    pageCount,
    stats: {
      total: all.length,
      active: all.filter((r) => r.customer.status === "active").length,
      atRisk: all.filter((r) => r.customer.status === "at_risk").length,
      openTickets: all.reduce((n, r) => n + r.openTickets, 0),
    },
  };
}

export interface ContactRow {
  contact: Contact;
  customer: Customer;
  openTickets: number;
  totalTickets: number;
  lastActivity: string | null;
}

export async function listContacts(q: string, page: number, size: number) {
  await delay();
  const tickets = ticketRows();
  const term = q.trim().toLowerCase();
  const rows: ContactRow[] = CONTACTS.filter(
    (c) => !term || [c.name, c.email, c.title, c.phone, CUSTOMERS.find((x) => x.id === c.customerId)?.name ?? ""].join(" ").toLowerCase().includes(term),
  )
    .map((contact) => {
      const mine = tickets.filter((t) => t.contact.id === contact.id);
      return {
        contact,
        customer: CUSTOMERS.find((c) => c.id === contact.customerId)!,
        openTickets: mine.filter(isActive).length,
        totalTickets: mine.length,
        lastActivity: mine.reduce<string | null>((max, t) => (!max || t.updatedAt > max ? t.updatedAt : max), null),
      };
    })
    .sort((a, b) => a.contact.name.localeCompare(b.contact.name));
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pageCount);
  return { items: rows.slice((current - 1) * size, current * size), total: rows.length, page: current, pageSize: size, pageCount };
}

// ── Detail ───────────────────────────────────────────────────────────

export interface CustomerDetail {
  customer: Customer;
  contacts: (Contact & { openTickets: number; totalTickets: number })[];
  tickets: TicketSummary[];
  notes: CustomerNote[];
  stats: {
    open: number;
    total: number;
    resolved: number;
    slaRisk: number;
    /** Average minutes to first response over tickets that have one. */
    avgFirstResponseMins: number | null;
  };
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  await delay();
  const customer = CUSTOMERS.find((c) => c.id === id);
  if (!customer) return null;
  const tickets = ticketRows()
    .filter((t) => t.customer.id === id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const responded = tickets.filter((t) => t.sla.firstRespondedAt);
  const row = toRow(customer, tickets);
  return {
    customer,
    contacts: CONTACTS.filter((c) => c.customerId === id).map((c) => {
      const theirs = tickets.filter((t) => t.contact.id === c.id);
      return { ...c, openTickets: theirs.filter(isActive).length, totalTickets: theirs.length };
    }),
    tickets,
    notes: [...(noteStore().get(id) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    stats: {
      open: row.openTickets,
      total: row.totalTickets,
      resolved: tickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
      slaRisk: row.slaRisk,
      avgFirstResponseMins: responded.length
        ? Math.round(responded.reduce((s, t) => s + Date.parse(t.sla.firstRespondedAt!) - Date.parse(t.createdAt), 0) / responded.length / 60_000)
        : null,
    },
  };
}

// ── Mutations ────────────────────────────────────────────────────────

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "account";

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const data = customerInputSchema.parse(input);
  await delay(200);
  if (CUSTOMERS.some((c) => c.name.toLowerCase() === data.name.toLowerCase())) throw new Error(`A customer named ${data.name} already exists.`);
  let id = `cus-${slug(data.name)}`;
  if (CUSTOMERS.some((c) => c.id === id)) id = uid("cus");
  const customer: Customer = { id, ...data, customerSince: new Date().toISOString().slice(0, 10) };
  registerCustomer(customer);
  return customer;
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<Customer> {
  const data = customerInputSchema.parse(input);
  await delay(180);
  const customer = CUSTOMERS.find((c) => c.id === id);
  if (!customer) throw new NotFoundError("Customer");
  if (CUSTOMERS.some((c) => c.id !== id && c.name.toLowerCase() === data.name.toLowerCase())) throw new Error(`A customer named ${data.name} already exists.`);
  registerCustomer({ ...customer, ...data });
  return customer;
}

export async function saveContact(input: ContactInput, id?: string): Promise<Contact> {
  const data = contactInputSchema.parse(input);
  await delay(180);
  if (!CUSTOMERS.some((c) => c.id === data.customerId)) throw new NotFoundError("Customer");
  if (CONTACTS.some((c) => c.id !== id && c.email === data.email)) throw new Error(`${data.email} already belongs to another contact.`);
  const existing = id ? CONTACTS.find((c) => c.id === id) : undefined;
  if (id && !existing) throw new NotFoundError("Contact");
  const contact: Contact = existing ? { ...existing, ...data } : { id: uid("con"), avatar: "", ...data };
  registerContact(contact);
  return contact;
}

export async function addCustomerNote(customerId: string, body: string): Promise<CustomerNote> {
  const data = customerNoteSchema.parse({ body });
  await delay(150);
  if (!CUSTOMERS.some((c) => c.id === customerId)) throw new NotFoundError("Customer");
  const note: CustomerNote = { id: uid("cn"), body: data.body, author: agent(CURRENT_AGENT_ID), createdAt: new Date().toISOString() };
  noteStore().set(customerId, [...(noteStore().get(customerId) ?? []), note]);
  return note;
}

export async function deleteCustomerNote(customerId: string, noteId: string): Promise<void> {
  await delay(120);
  noteStore().set(
    customerId,
    (noteStore().get(customerId) ?? []).filter((n) => n.id !== noteId),
  );
}
