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

export type SavedReplyInput = Pick<SavedReply, "name" | "shortcut" | "category" | "body">;

/** Creates or updates a saved reply. Shortcuts are unique, since the composer expands them by name. */
export async function saveSavedReply(input: SavedReplyInput, id?: string): Promise<SavedReply> {
  await delay();
  const existing = id ? db().find((r) => r.id === id) : undefined;
  const reply = savedReplySchema.parse({
    usageCount: 0,
    ...existing,
    ...input,
    id: existing?.id ?? `sr-${Date.now().toString(36)}`,
    updatedAt: new Date().toISOString(),
  });
  if (db().some((r) => r.id !== reply.id && r.shortcut === reply.shortcut)) throw new Error(`${reply.shortcut} is already used by another saved reply.`);
  if (existing) Object.assign(existing, reply);
  else db().push(reply);
  return reply;
}

export async function deleteSavedReply(id: string): Promise<void> {
  await delay();
  store = db().filter((r) => r.id !== id);
}
