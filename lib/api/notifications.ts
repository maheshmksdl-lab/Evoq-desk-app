/**
 * Mock notifications API. One in-memory inbox read by both the header bell
 * and the Notifications page, so read state agrees everywhere. Which kinds
 * appear is controlled by the agent's notification settings.
 */
import { NOTIFICATIONS, type DeskNotification, type NotificationKind } from "@/lib/mock-data/notifications";
import { getNotificationPrefs } from "@/lib/api/settings";

const delay = (ms = 60 + Math.random() * 80) => new Promise((r) => setTimeout(r, ms));

export interface NotificationItem extends Omit<DeskNotification, "minutesAgo"> {
  createdAt: string;
}

let store: NotificationItem[] | null = null;
const db = () =>
  (store ??= NOTIFICATIONS.map(({ minutesAgo, ...n }) => ({ ...n, createdAt: new Date(Date.now() - minutesAgo * 60_000).toISOString() })));

/** Newest first, leaving out kinds the agent has switched off. */
export async function listNotifications(): Promise<NotificationItem[]> {
  await delay();
  const prefs = getNotificationPrefs();
  return db()
    .filter((n) => prefs.inApp[n.kind])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markNotifications(ids: string[] | "all", read: boolean): Promise<void> {
  await delay(40);
  for (const n of db()) if (ids === "all" || ids.includes(n.id)) n.read = read;
}

export async function deleteNotification(id: string): Promise<void> {
  await delay(40);
  store = db().filter((n) => n.id !== id);
}

export type { NotificationKind };
