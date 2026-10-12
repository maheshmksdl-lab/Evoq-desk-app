import type { Icon } from "@phosphor-icons/react";
import { ChatTextIcon, NotePencilIcon, TimerIcon, UserPlusIcon } from "@phosphor-icons/react/dist/ssr";
import type { NotificationKind } from "@/lib/mock-data/notifications";

/** Icon, tone and label per notification kind — shared by the header bell and the Notifications page. */
export const KIND_META: Record<NotificationKind, { icon: Icon; tone: string; label: string }> = {
  sla: { icon: TimerIcon, tone: "bg-amber-50 text-amber-700", label: "SLA" },
  reply: { icon: ChatTextIcon, tone: "bg-desk-tint text-desk", label: "Replies" },
  assigned: { icon: UserPlusIcon, tone: "bg-sky-50 text-sky-700", label: "Assignments" },
  mention: { icon: NotePencilIcon, tone: "bg-slate-100 text-slate-700", label: "Mentions" },
};
