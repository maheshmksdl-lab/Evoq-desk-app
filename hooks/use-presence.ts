"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { presenceChannel } from "@/lib/realtime/presence-channel";
import type { AgentPresence } from "@/lib/types/ticket";
import { ticketKeys } from "./use-tickets";

const EMPTY: readonly AgentPresence[] = [];
const EMPTY_ALL: Readonly<Record<string, readonly AgentPresence[]>> = {};

/** Other agents on this ticket right now (viewing, replying, writing a note). */
export function usePresence(ticketId: string) {
  const subscribe = useCallback((cb: () => void) => presenceChannel.watch(ticketId, cb), [ticketId]);
  return useSyncExternalStore(subscribe, () => presenceChannel.peek(ticketId), () => EMPTY);
}

/** Presence on every ticket, keyed by ticket id — for list-row hints. */
export function usePresenceIndex() {
  return useSyncExternalStore(presenceChannel.watchAll, presenceChannel.peekAll, () => EMPTY_ALL);
}

/** Tells other agents the current agent is on this ticket, and whether they're composing. */
export function useAnnouncePresence(ticketId: string, typing: AgentPresence["typing"]) {
  useEffect(() => {
    presenceChannel.announce(ticketId, { viewing: true, typing });
  }, [ticketId, typing]);
  useEffect(() => () => presenceChannel.announce(ticketId, { viewing: false, typing: null }), [ticketId]);
}

/** Mounted once: when another agent changes a ticket, refetch what shows it. */
export function useRemoteChangeSync() {
  const qc = useQueryClient();
  useEffect(
    () =>
      presenceChannel.onRemoteChange((ticketId) => {
        void qc.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
        void qc.invalidateQueries({ queryKey: ticketKeys.lists() });
        void qc.invalidateQueries({ queryKey: ticketKeys.counts() });
        void qc.invalidateQueries({ queryKey: ticketKeys.overview() });
      }),
    [qc],
  );
}
