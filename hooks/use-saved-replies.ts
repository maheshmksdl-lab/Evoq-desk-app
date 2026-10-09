"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSavedReplies, recordSavedReplyUse } from "@/lib/api/saved-replies";

export const savedReplyKeys = { all: ["saved-replies"] as const };

export function useSavedReplies() {
  return useQuery({ queryKey: savedReplyKeys.all, queryFn: getSavedReplies, staleTime: 5 * 60_000 });
}

export function useRecordSavedReplyUse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recordSavedReplyUse,
    onSettled: () => qc.invalidateQueries({ queryKey: savedReplyKeys.all }),
  });
}
