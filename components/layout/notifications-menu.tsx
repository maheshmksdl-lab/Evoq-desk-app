"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellIcon } from "@phosphor-icons/react/dist/ssr";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KIND_META } from "@/components/notifications/notification-meta";
import { TimeLabel } from "@/components/shared/time-label";
import { useMarkNotifications, useNotifications } from "@/hooks/use-desk-modules";
import { useHydrated } from "@/hooks/use-hydrated";
import { ticketHref } from "@/lib/ticket-routes";
import { cn } from "@/lib/utils";

/** In-app notifications. Read state is shared with the Notifications page. */
export function NotificationsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const { data } = useNotifications();
  const mark = useMarkNotifications();
  const items = hydrated ? (data ?? []) : [];
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
            onClick={() => mark.mutate({ ids: "all", read: true })}
            className="text-xs font-medium text-desk hover:underline disabled:text-muted-foreground disabled:no-underline"
          >
            Mark all as read
          </button>
        </div>
        <ul className="max-h-[360px] overflow-y-auto py-1">
          {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</li>}
          {items.slice(0, 8).map((n) => {
            const { icon: IconCmp, tone } = KIND_META[n.kind];
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!n.read) mark.mutate({ ids: [n.id], read: true });
                    setOpen(false);
                    router.push(ticketHref(n.ticketId));
                  }}
                  className="flex w-full gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none"
                >
                  <span className={cn("mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md", tone)}>
                    <IconCmp size={15} weight="duotone" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", n.read ? "text-foreground" : "font-semibold text-foreground")}>{n.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{n.detail}</span>
                    <TimeLabel iso={n.createdAt} className="mt-0.5 block text-[11px] text-subtle-foreground" />
                  </span>
                  {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-desk" aria-label="Unread" />}
                </button>
              </li>
            );
          })}
        </ul>
        <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t px-4 py-2.5 text-center text-xs font-semibold text-desk hover:bg-desk-tint">
          View all notifications
        </Link>
      </PopoverContent>
    </Popover>
  );
}
