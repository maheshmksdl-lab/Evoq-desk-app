import type {
  SlaState,
  TicketCategory,
  TicketPriority,
  TicketSource,
  TicketStatus,
  TicketType,
} from "@/lib/types/ticket";

/** One place for every ticket label and its visual tone. */

/** Status → pill tone (dot + label pills, ServiceOps style). `dot` is used for small inline dots. */
export const STATUS_META: Record<TicketStatus, { label: string; tone: "teal" | "amber" | "orange" | "blue" | "gray"; dot: string }> = {
  open: { label: "Open", tone: "teal", dot: "bg-[#0F9D7A]" },
  pending: { label: "Pending", tone: "amber", dot: "bg-[#D97706]" },
  on_hold: { label: "On Hold", tone: "orange", dot: "bg-[#EA580C]" },
  resolved: { label: "Resolved", tone: "blue", dot: "bg-[#2563EB]" },
  closed: { label: "Closed", tone: "gray", dot: "bg-[#6B7280]" },
};

/** Priority → flag colour (ServiceOps PriorityTag); Urgent also gets a tinted pill. */
export const PRIORITY_META: Record<TicketPriority, { label: string; color: string; bg: string; text: string; rank: number }> = {
  low: { label: "Low", color: "#16A34A", bg: "#F0FDF4", text: "text-[#16A34A]", rank: 0 },
  medium: { label: "Medium", color: "#D97706", bg: "#FEF3C7", text: "text-[#D97706]", rank: 1 },
  high: { label: "High", color: "#EA580C", bg: "#FFF1E6", text: "text-[#EA580C]", rank: 2 },
  urgent: { label: "Urgent", color: "#DC2626", bg: "#FEF2F2", text: "text-[#DC2626]", rank: 3 },
};

export const TYPE_LABEL: Record<TicketType, string> = {
  question: "Question",
  incident: "Incident",
  problem: "Problem",
  feature_request: "Feature Request",
  task: "Task",
};

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  account: "Account",
  billing: "Billing",
  technical: "Technical",
  reporting: "Reporting",
  product: "Product",
  security: "Security",
  integration: "Integration",
  general: "General",
};

export const SOURCE_LABEL: Record<TicketSource, string> = {
  email: "Email",
  web_form: "Web Form",
  chat: "Chat",
  phone: "Phone",
  portal: "Portal",
  api: "API",
  social: "Social",
};

export const SLA_META: Record<SlaState, { label: string; text: string; badge: string }> = {
  on_track: { label: "On Track", text: "text-slate-700", badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/20" },
  at_risk: { label: "At Risk", text: "text-amber-700", badge: "bg-amber-50 text-amber-800 ring-amber-600/25" },
  breached: { label: "Breached", text: "text-red-700", badge: "bg-red-50 text-red-700 ring-red-600/20" },
  met: { label: "Met", text: "text-slate-600", badge: "bg-slate-100 text-slate-700 ring-slate-500/20" },
  paused: { label: "Paused", text: "text-slate-500", badge: "bg-slate-100 text-slate-600 ring-slate-500/20" },
};

/** Statuses in which the ticket is still being worked. */
export const ACTIVE_STATUSES: TicketStatus[] = ["open", "pending", "on_hold"];
