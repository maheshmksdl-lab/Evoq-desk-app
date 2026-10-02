import type { SlaState, TicketSla, TicketSlaView, TicketStatus } from "@/lib/types/ticket";

/** A running clock turns "at risk" inside these windows (minutes). */
const AT_RISK_WINDOW = { firstResponse: 60, resolution: 120 };

function clockState(due: string, doneAt: string | null, now: number, riskWindow: number, paused: boolean): SlaState {
  const dueMs = Date.parse(due);
  if (doneAt) return Date.parse(doneAt) <= dueMs ? "met" : "breached";
  if (paused) return "paused";
  if (now > dueMs) return "breached";
  return dueMs - now <= riskWindow * 60_000 ? "at_risk" : "on_track";
}

/** Evaluates both SLA clocks. Pending / On Hold pause the resolution clock. */
export function evaluateSla(sla: TicketSla, status: TicketStatus, now = Date.now()): TicketSlaView {
  const waiting = status === "pending" || status === "on_hold";
  return {
    ...sla,
    firstResponseStatus: clockState(sla.firstResponseDue, sla.firstRespondedAt, now, AT_RISK_WINDOW.firstResponse, false),
    resolutionStatus: clockState(sla.resolutionDue, sla.resolvedAt, now, AT_RISK_WINDOW.resolution, waiting),
  };
}

export interface SlaFocus {
  clock: "firstResponse" | "resolution";
  label: "First response" | "Resolution";
  state: SlaState;
  due: string;
}

/** The clock an agent should care about right now — first response until answered, then resolution. */
export function focusClock(sla: TicketSlaView): SlaFocus {
  if (sla.firstRespondedAt === null) {
    return { clock: "firstResponse", label: "First response", state: sla.firstResponseStatus, due: sla.firstResponseDue };
  }
  return { clock: "resolution", label: "Resolution", state: sla.resolutionStatus, due: sla.resolutionDue };
}

const URGENCY: Record<SlaState, number> = { breached: 0, at_risk: 1, on_track: 2, paused: 3, met: 4 };

/** Sort key: breached first, then soonest due. */
export function slaSortValue(sla: TicketSlaView): number {
  const f = focusClock(sla);
  return URGENCY[f.state] * 1e13 + Date.parse(f.due);
}
