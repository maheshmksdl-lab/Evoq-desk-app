export type NotificationKind = "sla" | "reply" | "assigned" | "mention";

export interface DeskNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  ticketId: string;
  minutesAgo: number;
  read: boolean;
}

/** Sample in-app notifications for the signed-in agent. */
export const NOTIFICATIONS: DeskNotification[] = [
  { id: "ntf-1", kind: "sla", title: "First response due in 5 minutes", detail: "#DK-2026-00466 · Two-factor codes rejected after phone change", ticketId: "DK-2026-00466", minutesAgo: 2, read: false },
  { id: "ntf-2", kind: "reply", title: "Michael Carter replied", detail: "#DK-2026-00482 · Unable to export monthly report", ticketId: "DK-2026-00482", minutesAgo: 35, read: false },
  { id: "ntf-3", kind: "mention", title: "Daniel Carter added a note", detail: "#DK-2026-00482 · \"Customer is using the legacy reporting module…\"", ticketId: "DK-2026-00482", minutesAgo: 58, read: false },
  { id: "ntf-4", kind: "reply", title: "Hannah Ortiz replied", detail: "#DK-2026-00473 · CSV import skips rows with special characters", ticketId: "DK-2026-00473", minutesAgo: 120, read: true },
  { id: "ntf-5", kind: "assigned", title: "Ticket assigned to you", detail: "#DK-2026-00466 · Two-factor codes rejected after phone change", ticketId: "DK-2026-00466", minutesAgo: 52, read: true },
];
