"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addMessage,
  createTicket,
  getTicket,
  mergeTicket,
  updateTicket,
  type TicketPatch,
} from "@/lib/api/tickets";
import type { ComposerInput, CreateTicketInput } from "@/lib/schemas/ticket";
import type { Ticket, TicketStatus } from "@/lib/types/ticket";
import { ticketKeys } from "./use-tickets";

export function useTicket(id: string) {
  return useQuery({ queryKey: ticketKeys.detail(id), queryFn: () => getTicket(id), refetchInterval: 60_000 });
}

/** Warms a ticket's cache (hover, next in queue) so switching to it in the workspace is instant. */
export function usePrefetchTicket() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => void qc.prefetchQuery({ queryKey: ticketKeys.detail(id), queryFn: () => getTicket(id), staleTime: 30_000 }),
    [qc],
  );
}

/** Writes the fresh ticket into the cache and refreshes lists / counts. */
function useSyncTicket() {
  const qc = useQueryClient();
  return (ticket: Ticket) => {
    qc.setQueryData(ticketKeys.detail(ticket.id), ticket);
    void qc.invalidateQueries({ queryKey: ticketKeys.lists() });
    void qc.invalidateQueries({ queryKey: ticketKeys.counts() });
    void qc.invalidateQueries({ queryKey: ticketKeys.overview() });
  };
}

const failed = () => toast.error("That change couldn't be saved. Please try again.");

export function useUpdateTicket() {
  const sync = useSyncTicket();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TicketPatch }) => updateTicket(id, patch),
    onSuccess: sync,
    onError: failed,
  });
}

/** One patch applied to several tickets (list bulk actions). */
export function useBulkUpdateTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: TicketPatch }) => Promise.all(ids.map((id) => updateTicket(id, patch))),
    onSuccess: (tickets) => {
      for (const t of tickets) qc.setQueryData(ticketKeys.detail(t.id), t);
      void qc.invalidateQueries({ queryKey: ticketKeys.lists() });
      void qc.invalidateQueries({ queryKey: ticketKeys.counts() });
      void qc.invalidateQueries({ queryKey: ticketKeys.overview() });
    },
    onError: failed,
  });
}

export function useAddMessage(id: string) {
  const sync = useSyncTicket();
  return useMutation({
    mutationFn: (input: ComposerInput & { setStatus?: TicketStatus }) => addMessage(id, input),
    onSuccess: sync,
    onError: failed,
  });
}

export function useMergeTicket() {
  const qc = useQueryClient();
  const sync = useSyncTicket();
  return useMutation({
    mutationFn: ({ primaryId, secondaryId }: { primaryId: string; secondaryId: string }) => mergeTicket(primaryId, secondaryId),
    onSuccess: (ticket, { secondaryId }) => {
      sync(ticket);
      void qc.invalidateQueries({ queryKey: ticketKeys.detail(secondaryId) });
    },
    onError: failed,
  });
}

export function useCreateTicket() {
  const sync = useSyncTicket();
  return useMutation({
    mutationFn: (input: CreateTicketInput) => createTicket(input),
    onSuccess: sync,
    onError: failed,
  });
}
