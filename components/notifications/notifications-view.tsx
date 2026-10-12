"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellSlashIcon, CheckIcon, EnvelopeOpenIcon, EnvelopeSimpleIcon, GearSixIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { PageShell, SecondaryButton } from "@/components/shared/desk-ui";
import { ModuleHeader, Segmented } from "@/components/shared/module-ui";
import { EmptyState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteNotification, useMarkNotifications, useNotifications } from "@/hooks/use-desk-modules";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUrlState } from "@/hooks/use-url-state";
import type { NotificationKind } from "@/lib/mock-data/notifications";
import { ticketHref } from "@/lib/ticket-routes";
import { cn } from "@/lib/utils";
import { KIND_META } from "./notification-meta";

type Filter = "all" | "unread" | NotificationKind;

/** Every notification for the signed-in agent, with filters and read / unread / delete. */
export function NotificationsView() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [state, setState] = useUrlState({ show: "all" });
  const { data } = useNotifications();
  const mark = useMarkNotifications();
  const remove = useDeleteNotification();
  const items = data ?? [];
  const unread = items.filter((n) => !n.read).length;
  const show = state.show as Filter;
  const rows = items.filter((n) => (show === "all" ? true : show === "unread" ? !n.read : n.kind === show));

  return (
    <PageShell>
      <ModuleHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : "You're all caught up"}
        actions={
          <>
            <SecondaryButton icon={CheckIcon} disabled={!unread} onClick={() => mark.mutate({ ids: "all", read: true })}>
              Mark all as read
            </SecondaryButton>
            <Link href="/settings?tab=notifications" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-card px-4 text-button-sm font-semibold text-ink transition-colors hover:border-desk">
              <GearSixIcon size={16} weight="bold" aria-hidden /> Preferences
            </Link>
          </>
        }
      />
      <section aria-label="Notifications" className="rounded-2xl border border-line-soft bg-card shadow-card">
        <div className="scrollbar-none overflow-x-auto p-3 sm:p-4">
          <Segmented
            label="Filter notifications"
            value={show}
            onChange={(v) => setState({ show: v })}
            options={[
              { value: "all", label: "All", count: items.length },
              { value: "unread", label: "Unread", count: unread },
              ...(Object.keys(KIND_META) as NotificationKind[]).map((k) => ({ value: k, label: KIND_META[k].label, count: items.filter((n) => n.kind === k).length })),
            ]}
          />
        </div>
        {!hydrated || !data ? (
          <div className="space-y-3 border-t border-line p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={BellSlashIcon} title={show === "unread" ? "No unread notifications" : "No notifications here"} hint="New SLA warnings, replies, assignments and mentions appear here." />
        ) : (
          <ul className="divide-y divide-line-soft border-t border-line">
            {rows.map((n) => {
              const { icon: IconCmp, tone } = KIND_META[n.kind];
              return (
                <li key={n.id} className={cn("group flex items-start gap-3 px-4 py-3.5 sm:px-5", !n.read && "bg-desk-surface")}>
                  <span className={cn("mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg", tone)}>
                    <IconCmp size={18} weight="duotone" aria-hidden />
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.read) mark.mutate({ ids: [n.id], read: true });
                      router.push(ticketHref(n.ticketId));
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className={cn("block text-[14px] text-ink", !n.read && "font-semibold")}>{n.title}</span>
                    <span className="block truncate text-[13px] text-ink-muted">{n.detail}</span>
                    <TimeLabel iso={n.createdAt} className="mt-0.5 block text-[12px] text-ink-faint" />
                  </button>
                  <span className="flex shrink-0 items-center gap-1">
                    {!n.read && <span className="mr-1 size-2 rounded-full bg-desk" aria-label="Unread" />}
                    <button
                      type="button"
                      onClick={() => mark.mutate({ ids: [n.id], read: !n.read })}
                      aria-label={n.read ? "Mark as unread" : "Mark as read"}
                      title={n.read ? "Mark as unread" : "Mark as read"}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-desk-tint hover:text-desk"
                    >
                      {n.read ? <EnvelopeSimpleIcon size={16} aria-hidden /> : <EnvelopeOpenIcon size={16} aria-hidden />}
                    </button>
                    <button type="button" onClick={() => remove.mutate(n.id)} aria-label="Delete notification" title="Delete" className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-[#EF4444]">
                      <TrashIcon size={16} aria-hidden />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
