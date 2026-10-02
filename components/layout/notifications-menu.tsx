"use client";

import type { Icon } from "@phosphor-icons/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, ChatTextIcon, NotePencilIcon, TimerIcon, UserPlusIcon } from "@phosphor-icons/react/dist/ssr";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NOTIFICATIONS, type NotificationKind } from "@/lib/mock-data/notifications";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<NotificationKind, { icon: Icon; tone: string }> = {
  sla: { icon: TimerIcon, tone: "bg-amber-50 text-amber-700" },
  reply: { icon: ChatTextIcon, tone: "bg-desk-tint text-desk" },
  assigned: { icon: UserPlusIcon, tone: "bg-sky-50 text-sky-700" },
  mention: { icon: NotePencilIcon, tone: "bg-slate-100 text-slate-700" },
};

const ago = (m: number) => (m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`);

/** In-app notifications (sample data; read state is local only). */
export function NotificationsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(NOTIFICATIONS);
  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex size-9 items-center justify-center rounded-lg text-[#5e6f76] transition-colors hover:bg-desk-tint focus-visible:outline-2 focus-visible:outline-desk-action data-[state=open]:bg-desk-tint"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <BellIcon size={20} weight="duotone" aria-hidden />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#d32f2f] px-[3px] text-[0.58rem] font-medium text-white">
              {unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="w-[min(92vw,360px)] gap-0 overflow-hidden rounded-2xl border-line p-0 shadow-pop">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          <button
            type="button"
            disabled={!unread}
            onClick={() => setItems((xs) => xs.map((n) => ({ ...n, read: true })))}
            className="text-xs font-medium text-desk hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            Mark all as read
          </button>
        </div>
        <ul className="max-h-[360px] overflow-y-auto py-1">
          {items.map((n) => {
            const { icon: IconCmp, tone } = KIND_ICON[n.kind];
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                    setOpen(false);
                    router.push(`/tickets/${n.ticketId}`);
                  }}
                  className="flex w-full gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none"
                >
                  <span className={cn("mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md", tone)}>
                    <IconCmp size={15} weight="duotone" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", n.read ? "text-foreground" : "font-semibold text-foreground")}>{n.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{n.detail}</span>
                    <span className="mt-0.5 block text-[11px] text-subtle-foreground">{ago(n.minutesAgo)}</span>
                  </span>
                  {!n.read && (
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-desk" aria-label="Unread" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
