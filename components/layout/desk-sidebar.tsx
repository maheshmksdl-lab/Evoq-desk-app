"use client";

import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LightningIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useViewCounts } from "@/hooks/use-tickets";
import { useRegisterAction } from "./actions-context";
import { cn } from "@/lib/utils";
import { DeskLogo } from "./desk-logo";
import { INBOX, INBOX_QUEUES, MAIN_ITEMS, OVERVIEW, queueHref, type InboxQueue, type NavItem } from "./nav-config";
import { useShell } from "./shell-context";

const TONE_TEXT = { orange: "text-[#EA580C]", red: "text-[#E5484D]" } as const;

/** Wraps collapsed-rail items in a right-side tooltip. */
function RailTip({ show, label, children }: { show: boolean; label: string; children: React.ReactElement }) {
  if (!show) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function NavRow({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const IconCmp = item.icon;
  const cls = cn(
    "group flex items-center rounded-lg text-[14px] leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-desk-action",
    collapsed ? "mx-auto size-10 justify-center" : "h-10 w-full gap-3 px-3",
    active ? "bg-desk-10 font-semibold text-ink" : "font-medium text-ink-body hover:bg-desk-depth-10 hover:text-ink",
  );
  const body = (
    <>
      <IconCmp size={19} weight={active ? "fill" : "regular"} aria-hidden className={cn("shrink-0", active ? "text-desk" : "text-ink-muted group-hover:text-ink")} />
      <span className={collapsed ? "sr-only" : "truncate"}>{item.label}</span>
    </>
  );

  if (!item.available) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span aria-disabled="true" tabIndex={0} className={cn(cls, "cursor-default")}>
            {body}
            <span className="sr-only"> — coming soon</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label} · coming soon</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <RailTip show={collapsed} label={item.label}>
      <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cls}>
        {body}
      </Link>
    </RailTip>
  );
}

function QueueRow({ queue, active, count, onNavigate }: { queue: InboxQueue; active: boolean; count?: number; onNavigate?: () => void }) {
  const IconCmp = queue.icon;
  return (
    <li>
      <Link
        href={queueHref(queue)}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-8 items-center gap-2.5 rounded-lg pr-3 pl-6 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-desk-action",
          active ? "bg-desk-10 font-semibold text-ink" : "text-ink-body hover:bg-desk-depth-10 hover:text-ink",
        )}
      >
        <IconCmp size={16} aria-hidden className={cn("shrink-0", queue.tone ? TONE_TEXT[queue.tone] : active ? "text-desk" : "text-ink-muted")} />
        <span className="flex-1 truncate">{queue.label}</span>
        {count !== undefined && <span className={cn("text-[12px] tabular-nums", active ? "font-semibold text-ink" : "text-ink-muted")}>{count}</span>}
      </Link>
    </li>
  );
}

/** The open ticket's queue (/tickets/<id>?view=mine) — read in its own Suspense boundary. */
function TicketViewParam({ onView }: { onView: (view: string | null) => ReactNode }) {
  return onView(useSearchParams().get("view"));
}

/** Overview · Inbox (with its queues) · then the modules. */
function Nav(props: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  // A ticket URL keeps its queue in ?view, so the queue it was opened from stays highlighted.
  if (!pathname.startsWith("/tickets/")) return <NavItems {...props} pathname={pathname} />;
  return (
    <Suspense fallback={<NavItems {...props} pathname={pathname} />}>
      <TicketViewParam onView={(view) => <NavItems {...props} pathname={pathname} ticketView={view} />} />
    </Suspense>
  );
}

function NavItems({ collapsed, onNavigate, pathname, ticketView }: { collapsed: boolean; onNavigate?: () => void; pathname: string; ticketView?: string | null }) {
  const { data: counts } = useViewCounts();
  const activeQueue = INBOX_QUEUES.find((q) => pathname === queueHref(q) || q.view === ticketView);
  const under = (base: string) => pathname === base || pathname.startsWith(`${base}/`);

  return (
    <>
      <div className="space-y-0.5">
        <NavRow item={OVERVIEW} active={under(OVERVIEW.href)} collapsed={collapsed} onNavigate={onNavigate} />
        <NavRow item={INBOX} active={under("/inbox") || !!activeQueue} collapsed={collapsed} onNavigate={onNavigate} />
        {!collapsed && (
          <ul className="space-y-0.5 pt-0.5" aria-label="Inbox queues">
            {INBOX_QUEUES.map((q) => (
              <QueueRow key={q.label} queue={q} active={q === activeQueue} count={q.view === "recent" || !counts ? undefined : counts[q.view]} onNavigate={onNavigate} />
            ))}
          </ul>
        )}
      </div>
      <div className={cn("space-y-0.5", collapsed ? "mt-3 border-t border-line pt-3" : "mt-6")}>
        {MAIN_ITEMS.map((item) => (
          <NavRow key={item.href} item={item} active={item.available && under(item.href) && !activeQueue} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
    </>
  );
}

/** "Quick actions" card — opens the Ctrl/⌘ K palette. */
function QuickActionsCard({ collapsed, onOpen }: { collapsed: boolean; onOpen: () => void }) {
  if (collapsed) {
    return (
      <RailTip show label="Quick actions (⌘ K)">
        <button
          type="button"
          onClick={onOpen}
          aria-label="Quick actions"
          aria-keyshortcuts="Control+K Meta+K"
          className="mx-auto flex size-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-desk-depth-10 hover:text-ink focus-visible:outline-2 focus-visible:outline-desk-action"
        >
          <LightningIcon size={19} aria-hidden />
        </button>
      </RailTip>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-keyshortcuts="Control+K Meta+K"
      className="flex w-full items-start gap-3 rounded-xl border border-line bg-card px-3 py-3 text-left shadow-card transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-desk-action"
    >
      <LightningIcon size={19} aria-hidden className="mt-px shrink-0 text-ink" />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] leading-5 font-semibold text-ink">Quick actions</span>
        <span className="block truncate text-[12px] leading-4 text-ink-muted">Search or run an action...</span>
        <span className="mt-2 flex gap-1" aria-hidden>
          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1 font-sans text-[11px] text-ink-body">⌘</kbd>
          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1 font-sans text-[11px] text-ink-body">K</kbd>
        </span>
      </span>
    </button>
  );
}

/** Desktop: fixed under the header, collapsible to icons. Phones / tablets: overlay drawer. */
export function DeskSidebar() {
  const { collapsed, toggleCollapsed, drawerOpen, setDrawerOpen, setPaletteOpen } = useShell();
  const close = () => setDrawerOpen(false);
  // Desktop collapses the rail; smaller screens open the navigation drawer instead.
  useRegisterAction("toggle-sidebar", () => (window.matchMedia("(min-width: 1024px)").matches ? toggleCollapsed() : setDrawerOpen(true)));

  return (
    <>
      <aside
        aria-label="Main navigation"
        className="fixed top-[72px] left-0 z-40 hidden h-[calc(100dvh-72px)] flex-col overflow-hidden border-r border-line bg-sidebar select-none lg:flex"
        style={{ width: collapsed ? 68 : 260, transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <nav className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 scrollbar-thin">
          <Nav collapsed={collapsed} />
        </nav>
        <div className="shrink-0 px-3 pt-2 pb-4">
          <QuickActionsCard collapsed={collapsed} onOpen={() => setPaletteOpen(true)} />
        </div>
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[min(280px,85vw)] gap-0 border-none bg-sidebar p-0 shadow-[4px_0_24px_rgba(16,24,40,0.08)] lg:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Desk modules</SheetDescription>
          <div className="flex items-center gap-3 border-b border-line px-4 py-4">
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink transition-all hover:bg-desk-depth-10 hover:text-desk"
            >
              <XIcon size={18} weight="bold" aria-hidden />
            </button>
            <DeskLogo />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            <Nav collapsed={false} onNavigate={close} />
          </nav>
          <div className="px-3 pt-2 pb-4">
            <QuickActionsCard
              collapsed={false}
              onOpen={() => {
                close();
                setPaletteOpen(true);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
