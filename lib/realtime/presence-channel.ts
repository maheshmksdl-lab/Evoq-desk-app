import { applyRemoteChange, type RemoteChange } from "@/lib/api/tickets";
import { agentPresenceSchema } from "@/lib/schemas/entities";
import type { AgentPresence } from "@/lib/types/ticket";

/**
 * Collision awareness transport. The UI only talks to `PresenceChannel`;
 * today it is backed by a local simulation, later by a WebSocket or SSE
 * client with the same shape. Presence lists never include the current agent.
 */
export interface PresenceChannel {
  /** Other agents on one ticket. The listener runs on every change; read state with `peek`. */
  watch(ticketId: string, listener: () => void): () => void;
  peek(ticketId: string): readonly AgentPresence[];
  /** Presence across every ticket, for list-row hints. */
  watchAll(listener: () => void): () => void;
  peekAll(): Readonly<Record<string, readonly AgentPresence[]>>;
  /** Tell other agents what the current agent is doing on a ticket. */
  announce(ticketId: string, state: { viewing: boolean; typing: AgentPresence["typing"] }): void;
  /** Ticket data was changed by another agent; consumers refetch it. */
  onRemoteChange(listener: (ticketId: string) => void): () => void;
}

// ── Local simulation ─────────────────────────────────────────────────

type Step =
  | { at: number; agent: string; presence: Partial<Pick<AgentPresence, "state" | "typing">> | null }
  | { at: number; agent: string; change: RemoteChange };

interface Scenario {
  /** Who is already on the ticket when the agent opens it. */
  initial: { agent: string; typing?: AgentPresence["typing"] }[];
  /** Timed events (ms after the ticket is first opened); played once per session. */
  script?: Step[];
}

const DANIEL_REPLY = [
  "Hi Michael,",
  "",
  "Thanks for the screenshot and console log — they confirmed it. Exports over about 50,000 rows time out in the legacy reporting module, and September's report is just over that.",
  "",
  "While we fix the timeout, the new Reports module can build the full month in the background and email you a download link: Reports → Monthly operations → Export → \"Email me when ready\". That should get you the board pack today.",
  "",
  "I'll update this ticket as soon as the fix is live.",
  "",
  "Daniel",
].join("\n");

/** Seeded collision scenarios (the spec's DK-2026-00482 case first). */
const SCENARIOS: Record<string, Scenario> = {
  "DK-2026-00482": {
    initial: [{ agent: "agt-alex" }, { agent: "agt-daniel" }],
    script: [
      { at: 4_000, agent: "agt-daniel", presence: { typing: "reply" } },
      { at: 11_000, agent: "agt-alex", change: { patch: { addTag: "follow-up" } } },
      { at: 26_000, agent: "agt-daniel", change: { message: { visibility: "public", body: DANIEL_REPLY, attachments: [] } } },
      { at: 26_000, agent: "agt-daniel", presence: { typing: null } },
      { at: 45_000, agent: "agt-alex", presence: null },
    ],
  },
  "DK-2026-00481": { initial: [{ agent: "agt-alex" }, { agent: "agt-daniel" }, { agent: "agt-olivia" }] },
  "DK-2026-00466": { initial: [{ agent: "agt-emily", typing: "note" }] },
  "DK-2026-00479": { initial: [{ agent: "agt-james", typing: "reply" }] },
  "DK-2026-00473": { initial: [{ agent: "agt-olivia" }] },
};

function createMockChannel(): PresenceChannel {
  const byTicket = new Map<string, readonly AgentPresence[]>();
  let all: Record<string, readonly AgentPresence[]> = {};
  const ticketListeners = new Map<string, Set<() => void>>();
  const allListeners = new Set<() => void>();
  const changeListeners = new Set<(ticketId: string) => void>();
  const played = new Set<string>();
  /** What the current agent last announced per ticket — a real channel sends this to the server. */
  const outgoing = new Map<string, { viewing: boolean; typing: AgentPresence["typing"] }>();
  let seeded = false;

  const now = () => new Date().toISOString();

  function set(ticketId: string, agents: AgentPresence[]) {
    if (process.env.NODE_ENV !== "production") agentPresenceSchema.array().parse(agents);
    byTicket.set(ticketId, agents);
    all = { ...all, [ticketId]: agents };
    ticketListeners.get(ticketId)?.forEach((l) => l());
    allListeners.forEach((l) => l());
  }

  function seed() {
    if (seeded) return;
    seeded = true;
    for (const [ticketId, s] of Object.entries(SCENARIOS)) {
      set(
        ticketId,
        s.initial.map(({ agent, typing = null }) => ({ agentId: agent, ticketId, state: "viewing", typing, lastSeen: now() })),
      );
    }
  }

  function update(ticketId: string, agentId: string, presence: Partial<Pick<AgentPresence, "state" | "typing">> | null) {
    const rest = (byTicket.get(ticketId) ?? []).filter((p) => p.agentId !== agentId);
    if (!presence) return set(ticketId, rest);
    const prev = byTicket.get(ticketId)?.find((p) => p.agentId === agentId);
    set(ticketId, [...rest, { agentId, ticketId, state: "viewing", typing: null, ...prev, ...presence, lastSeen: now() }]);
  }

  /** Scripts start the first time the ticket is opened, so the agent sees them unfold. */
  function play(ticketId: string) {
    const script = SCENARIOS[ticketId]?.script;
    if (!script || played.has(ticketId)) return;
    played.add(ticketId);
    for (const step of script) {
      setTimeout(() => {
        if ("change" in step) {
          applyRemoteChange(step.agent, ticketId, step.change);
          changeListeners.forEach((l) => l(ticketId));
        } else {
          update(ticketId, step.agent, step.presence);
        }
      }, step.at);
    }
  }

  const EMPTY: readonly AgentPresence[] = [];

  return {
    watch(ticketId, listener) {
      seed();
      play(ticketId);
      const set = ticketListeners.get(ticketId) ?? new Set();
      set.add(listener);
      ticketListeners.set(ticketId, set);
      return () => set.delete(listener);
    },
    peek: (ticketId) => byTicket.get(ticketId) ?? EMPTY,
    watchAll(listener) {
      seed();
      allListeners.add(listener);
      return () => allListeners.delete(listener);
    },
    peekAll: () => all,
    announce(ticketId, state) {
      if (state.viewing) outgoing.set(ticketId, state);
      else outgoing.delete(ticketId);
    },
    onRemoteChange(listener) {
      changeListeners.add(listener);
      return () => changeListeners.delete(listener);
    },
  };
}

/** The app's presence channel. Swap this line for a WebSocket/SSE implementation. */
export const presenceChannel: PresenceChannel = createMockChannel();
