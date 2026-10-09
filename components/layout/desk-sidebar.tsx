"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CaretDownIcon, CaretRightIcon, LightningIcon, UsersThreeIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHydrated } from "@/hooks/use-hydrated";
import { useLookups, useTeamCounts, useViewCounts } from "@/hooks/use-tickets";
import { useRegisterAction } from "./actions-context";
import { cn } from "@/lib/utils";
import { DeskLogo } from "./desk-logo";
import { INBOX, INBOX_QUEUES, MAIN_ITEMS, OVERVIEW, queueHref, teamHref, type NavItem } from "./nav-config";
import { useShell } from "./shell-context";

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
    "group relative flex items-center rounded-lg text-[15px] leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-desk-action",
    collapsed ? "mx-auto size-10 justify-center" : "h-11 w-full gap-3.5 px-3",
    active
      ? cn(
          "bg-desk-10 font-semibold text-ink",
          // Expanded: the active row runs to the sidebar's edge, marked by a bar.
          !collapsed && "-ml-3 w-[calc(100%+12px)] rounded-l-none pl-6 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-r-full before:bg-desk",
        )
      : "font-medium text-ink-body hover:bg-desk-depth-10 hover:text-ink",
  );
  const body = (
    <>
      <IconCmp size={20} weight={active ? "fill" : "regular"} aria-hidden className={cn("shrink-0", active ? "text-desk" : "text-ink-body group-hover:text-ink")} />
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

/** A queue or team inside a group: glyph, label, then its count on the right. */
function SubRow({
  href,
  label,
  icon,
  active,
  count,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  count?: number;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex h-[34px] items-center gap-3 rounded-lg px-3 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-desk-action",
          active ? "bg-desk-10 font-medium text-desk" : "text-ink-body hover:bg-desk-depth-10 hover:text-ink",
        )}
      >
        <span className={cn("flex w-5 shrink-0 justify-center", active ? "text-desk" : "text-ink-faint group-hover:text-ink-muted")}>{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {count !== undefined && <span className={cn("text-[13px] tabular-nums", active ? "font-semibold text-desk" : "text-ink-muted")}>{count}</span>}
      </Link>
    </li>
  );
}

/** Teams: a collapsible group, each team linking to its open queue in the Inbox. */
function TeamsGroup({ activeTeam, onNavigate }: { activeTeam: string | null; onNavigate?: () => void }) {
  const [open, setOpen] = useState(true);
  const { data: lookups } = useLookups();
  const { data: counts } = useTeamCounts();
  const hydrated = useHydrated();
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-10 w-full items-center gap-2.5 rounded-lg px-1 text-[15px] font-semibold text-ink transition-colors hover:bg-desk-depth-10 focus-visible:outline-2 focus-visible:outline-desk-action"
      >
        <CaretDownIcon size={14} weight="bold" aria-hidden className={cn("shrink-0 text-ink-muted transition-transform", !open && "-rotate-90")} />
        <UsersThreeIcon size={20} aria-hidden className="shrink-0 text-ink-body" />
        Teams
      </button>
      {open && (
        <ul className="space-y-0.5 pt-0.5 pl-4" aria-label="Teams">
          {(lookups?.teams ?? []).map((t) => (
            <SubRow
              key={t.id}
              href={teamHref(t.id)}
              label={t.name}
              icon={<CaretRightIcon size={12} weight="bold" aria-hidden />}
              active={activeTeam === t.id}
              count={hydrated ? counts?.[t.id] : undefined}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** The queue (?view on a ticket URL) and team (?team) in the URL — read in their own Suspense boundary. */
function UrlParams({ children }: { children: (params: { view: string | null; team: string | null }) => ReactNode }) {
  const params = useSearchParams();
  const team = params.get("team");
  // Only a single-team filter is that team's queue.
  return children({ view: params.get("view"), team: team && !team.includes(",") ? team : null });
}

/** Overview · Inbox (with its queues) · Teams · then the modules. */
function Nav(props: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <Suspense fallback={<NavItems {...props} pathname={pathname} />}>
      <UrlParams>{({ view, team }) => <NavItems {...props} pathname={pathname} ticketView={view} team={team} />}</UrlParams>
    </Suspense>
  );
}

function NavItems({
  collapsed,
  onNavigate,
  pathname,
  ticketView,
  team,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  pathname: string;
  ticketView?: string | null;
  team?: string | null;
}) {
  const { data: counts } = useViewCounts();
  const hydrated = useHydrated();
  const under = (base: string) => pathname === base || pathname.startsWith(`${base}/`);
  // A ticket URL keeps its queue in ?view, so the queue it was opened from stays highlighted.
  const ticketQueue = pathname.startsWith("/tickets/") ? ticketView : null;
  const inQueue = under("/inbox") || !!INBOX_QUEUES.find((q) => q.view === ticketQueue);
  // A team's queue (/inbox/open?team=…) highlights the team rather than All open.
  const activeTeam = inQueue && team ? team : null;
  const activeQueue = activeTeam ? undefined : INBOX_QUEUES.find((q) => pathname === queueHref(q) || q.view === ticketQueue);

  return (
    <>
      <div className="space-y-1">
        <NavRow item={OVERVIEW} active={under(OVERVIEW.href)} collapsed={collapsed} onNavigate={onNavigate} />
        <NavRow item={INBOX} active={inQueue} collapsed={collapsed} onNavigate={onNavigate} />
        {!collapsed && (
          <ul className="space-y-0.5 pt-1" aria-label="Inbox queues">
            {INBOX_QUEUES.map((q) => {
              const QueueIcon = q.icon;
              return (
                <SubRow
                  key={q.view}
                  href={queueHref(q)}
                  label={q.label}
                  icon={<QueueIcon size={16} aria-hidden />}
                  active={q === activeQueue}
                  count={q.counted && counts && hydrated ? counts[q.view] : undefined}
                  onNavigate={onNavigate}
                />
              );
            })}
          </ul>
        )}
      </div>
      {!collapsed && (
        <div className="mt-3 border-t border-line-soft pt-3">
          <TeamsGroup activeTeam={activeTeam} onNavigate={onNavigate} />
        </div>
      )}
      <div className={cn("mt-3 space-y-1 border-t pt-3", collapsed ? "border-line" : "border-line-soft")}>
        {MAIN_ITEMS.map((item) => (
          <NavRow key={item.href} item={item} active={item.available && under(item.href) && !inQueue} collapsed={collapsed} onNavigate={onNavigate} />
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
          <nav className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-3">
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
