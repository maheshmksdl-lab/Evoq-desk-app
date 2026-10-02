import { buildSavedReplies } from "@/lib/mock-data/saved-replies";
import { savedReplySchema } from "@/lib/schemas/entities";
import type { SavedReply } from "@/lib/types/ticket";

/**
 * Saved replies "API". In-memory for this frontend-only build; each function
 * maps one-to-one onto an endpoint a real backend would expose.
 */

let store: SavedReply[] | null = null;
const db = () =>
  (store ??= (() => {
    const replies = buildSavedReplies(Date.now());
    if (process.env.NODE_ENV !== "production") savedReplySchema.array().parse(replies);
    return replies;
  })());

const delay = (ms = 60 + Math.random() * 80) => new Promise((r) => setTimeout(r, ms));

/** Most-used first. */
export async function getSavedReplies(): Promise<SavedReply[]> {
  await delay();
  return [...db()].sort((a, b) => b.usageCount - a.usageCount);
}

/** Counts an insertion, so the list stays ordered by what agents actually use. */
export async function recordSavedReplyUse(id: string): Promise<void> {
  const reply = db().find((r) => r.id === id);
  if (reply) reply.usageCount += 1;
}
