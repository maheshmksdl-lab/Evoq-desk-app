/**
 * Mock settings API: the signed-in agent's profile and notification
 * preferences, team membership and SLA policies. In memory for the browser
 * session, like the rest of the mock backend.
 *
 * SLA policy edits apply to tickets created afterwards — existing tickets
 * keep the targets they were opened with, as in Zoho Desk and Deskpro.
 */
import { AGENTS, CURRENT_AGENT_ID, TEAMS } from "@/lib/mock-data/agents";
import type { NotificationKind } from "@/lib/mock-data/notifications";
import { SLA_POLICY } from "@/lib/mock-data/tickets";
import { NotFoundError, ticketRows } from "@/lib/api/tickets";
import { agentEditSchema, profileInputSchema, slaPolicySchema, type AgentEdit, type ProfileInput, type SlaPolicy, type TIMEZONES } from "@/lib/schemas/desk";
import { ACTIVE_STATUSES } from "@/lib/ticket-meta";
import { TICKET_PRIORITIES, type Agent, type Team, type TicketPriority } from "@/lib/types/ticket";

const delay = (ms = 80 + Math.random() * 100) => new Promise((r) => setTimeout(r, ms));

// ── Profile ──────────────────────────────────────────────────────────

export interface Profile {
  agent: Agent;
  team: Team;
  timezone: (typeof TIMEZONES)[number];
  signature: string;
}

const profileExtras: Pick<Profile, "timezone" | "signature"> = {
  timezone: "America/New_York",
  signature: "Best regards,\nSarah Wilson\nTechnical Support · Desk",
};

const me = () => AGENTS.find((a) => a.id === CURRENT_AGENT_ID)!;

export async function getProfile(): Promise<Profile> {
  await delay(50);
  const agent = me();
  return { agent: { ...agent }, team: TEAMS.find((t) => t.id === agent.teamId)!, ...profileExtras };
}

/** Availability is the agent record's status, so teammates see it on the Overview and in assignment pickers. */
export async function updateProfile(input: Partial<ProfileInput>): Promise<Profile> {
  const current = await getProfile();
  const data = profileInputSchema.parse({ status: current.agent.status, timezone: current.timezone, signature: current.signature, ...input });
  me().status = data.status;
  profileExtras.timezone = data.timezone;
  profileExtras.signature = data.signature;
  return getProfile();
}

// ── Notification preferences ─────────────────────────────────────────

export interface NotificationPrefs {
  /** Kinds shown in the bell and on the Notifications page. */
  inApp: Record<NotificationKind, boolean>;
  /** Kinds also sent by email. */
  email: Record<NotificationKind, boolean>;
  dailyDigest: boolean;
}

const prefs: NotificationPrefs = {
  inApp: { sla: true, reply: true, assigned: true, mention: true },
  email: { sla: true, reply: false, assigned: true, mention: true },
  dailyDigest: false,
};

/** Synchronous read for the notifications API. */
export const getNotificationPrefs = (): NotificationPrefs => structuredClone(prefs);

export async function getNotificationSettings(): Promise<NotificationPrefs> {
  await delay(40);
  return getNotificationPrefs();
}

export async function updateNotificationSettings(next: NotificationPrefs): Promise<NotificationPrefs> {
  await delay(80);
  Object.assign(prefs, structuredClone(next));
  return getNotificationPrefs();
}

// ── Team members ─────────────────────────────────────────────────────

export interface TeamMember {
  agent: Agent;
  team: Team;
  openTickets: number;
  resolvedTickets: number;
}

export async function listTeamMembers(): Promise<{ members: TeamMember[]; teams: (Team & { members: number; openTickets: number })[] }> {
  await delay();
  const rows = ticketRows();
  const members = AGENTS.map((agent) => ({
    agent: { ...agent },
    team: TEAMS.find((t) => t.id === agent.teamId)!,
    openTickets: rows.filter((t) => t.assignee?.id === agent.id && ACTIVE_STATUSES.includes(t.status)).length,
    resolvedTickets: rows.filter((t) => t.assignee?.id === agent.id && (t.status === "resolved" || t.status === "closed")).length,
  }));
  const teams = TEAMS.map((t) => ({
    ...t,
    members: AGENTS.filter((a) => a.teamId === t.id).length,
    openTickets: rows.filter((r) => r.team.id === t.id && ACTIVE_STATUSES.includes(r.status)).length,
  }));
  return { members, teams };
}

export async function updateAgent(id: string, input: AgentEdit): Promise<void> {
  const data = agentEditSchema.parse(input);
  await delay(140);
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) throw new NotFoundError("Agent");
  if (!TEAMS.some((t) => t.id === data.teamId)) throw new NotFoundError("Team");
  agent.teamId = data.teamId;
  agent.role = data.role;
}

// ── SLA policies ─────────────────────────────────────────────────────

export async function getSlaPolicies(): Promise<Record<TicketPriority, SlaPolicy>> {
  await delay(50);
  return Object.fromEntries(TICKET_PRIORITIES.map((p) => [p, { ...SLA_POLICY[p] }])) as Record<TicketPriority, SlaPolicy>;
}

export async function updateSlaPolicy(priority: TicketPriority, input: SlaPolicy): Promise<void> {
  const data = slaPolicySchema.parse(input);
  await delay(120);
  SLA_POLICY[priority] = data;
}
