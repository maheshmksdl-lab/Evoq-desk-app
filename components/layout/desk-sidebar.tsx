"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { useViewCounts } from "@/hooks/use-tickets";
import { AGENTS, CURRENT_AGENT_ID } from "@/lib/mock-data/agents";
import { cn } from "@/lib/utils";
import { DeskLogo } from "./desk-logo";
import { ADMIN_GROUP, MAIN_GROUPS, type NavGroup, type NavItem } from "./nav-config";
import { useShell } from "./shell-context";

const me = AGENTS.find((a) => a.id === CURRENT_AGENT_ID)!;

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function useBadges(): Record<string, number | undefined> {
  const { data } = useViewCounts();
  // Tickets shows what needs an owner — the same "needs attention" badge ServiceOps puts on Work Orders.
  return { "/tickets": data?.unassigned || undefined };
}

function GroupLabel({ label }: { label: string }) {
  return <p className="px-3 pt-4 pb-1.5 text-nav-group-label text-ink-muted uppercase">{label}</p>;
}

function ProfileCard({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="mt-1 flex justify-center py-1">
            <PersonAvatar name={me.name} src={me.avatar} size="md" status={me.status} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="right">
          {me.name} — {me.role}
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-2">
      <PersonAvatar name={me.name} src={me.avatar} size="md" status={me.status} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-ink">{me.name}</p>
        <p className="truncate text-[10px] text-ink-muted">
          {me.role} · {me.email}
        </p>
      </div>
    </div>
  );
}

function NavRow({ item, collapsed, badge, onNavigate, mobile }: { item: NavItem; collapsed: boolean; badge?: number; onNavigate?: () => void; mobile?: boolean }) {
  const pathname = usePathname();
  const active = item.available && isActive(pathname, item.href);
  const IconCmp = item.icon;
  const base = cn(
    "group relative flex items-center text-nav-item transition-all duration-150",
    mobile ? "rounded-xl" : "rounded-lg",
    collapsed ? "mx-auto size-10 justify-center" : "w-full gap-3 px-3 py-2.5",
  );

  if (!item.available) {
    const body = (
      <span aria-disabled="true" className={cn(base, "cursor-default text-ink/45")}>
        <IconCmp size={18} weight="duotone" aria-hidden className="shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <span className="rounded-full bg-desk-depth-10 px-1.5 py-0.5 text-[10px] leading-none font-bold text-ink-muted">Soon</span>
          </>
        )}
        <span className="sr-only"> — coming soon</span>
      </span>
    );
    return collapsed ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex justify-center">{body}</span>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label} · coming soon</TooltipContent>
      </Tooltip>
    ) : (
      body
    );
  }

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        base,
        "focus-visible:outline-2 focus-visible:outline-desk-action",
        active ? "bg-desk-10 text-ink" : "text-ink hover:bg-desk-depth-10 hover:text-desk",
      )}
    >
      <IconCmp size={18} weight="duotone" aria-hidden className={cn("shrink-0 transition-colors", active ? "text-desk" : "text-ink group-hover:text-desk")} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {badge && !active && <span className="rounded-full bg-desk-10 px-1.5 py-0.5 text-[10px] leading-none font-bold text-desk">{badge}</span>}
          {active && <span className="size-1.5 shrink-0 rounded-full bg-desk" aria-hidden />}
        </>
      )}
      {collapsed && badge && !active && <span className="absolute top-0.5 right-0.5 size-2 rounded-full border-2 border-white bg-desk" aria-hidden />}
      {collapsed && <span className="sr-only">{item.label}</span>}
    </Link>
  );
  return collapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex justify-center">{link}</span>
      </TooltipTrigger>
      <TooltipContent side="right">{badge ? `${item.label} · ${badge}` : item.label}</TooltipContent>
    </Tooltip>
  ) : (
    link
  );
}

function Group({ group, index, collapsed, badges, onNavigate, mobile }: { group: NavGroup; index: number; collapsed: boolean; badges: Record<string, number | undefined>; onNavigate?: () => void; mobile?: boolean }) {
  return (
    <div className="space-y-0.5">
      {group.label && (collapsed ? index > 0 ? <div className="mx-3 my-2 border-t border-line" /> : null : <GroupLabel label={group.label} />)}
      {group.items.map((item) => (
        <NavRow key={item.href} item={item} collapsed={collapsed} badge={badges[item.href]} onNavigate={onNavigate} mobile={mobile} />
      ))}
    </div>
  );
}

/** Desktop: fixed under the header, collapsible to icons. Phones / tablets: overlay drawer. */
export function DeskSidebar() {
  const { collapsed, drawerOpen, setDrawerOpen } = useShell();
  const badges = useBadges();
  const close = () => setDrawerOpen(false);

  return (
    <>
      <aside
        aria-label="Main navigation"
        className="fixed top-[72px] left-0 z-40 hidden h-[calc(100dvh-72px)] flex-col overflow-hidden border-r border-line bg-sidebar select-none lg:flex"
        style={{ width: collapsed ? 68 : 260, transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <nav className="flex-1 overflow-x-hidden overflow-y-auto px-2 py-3 scrollbar-thin">
          {MAIN_GROUPS.map((g, i) => (
            <Group key={g.label ?? i} group={g} index={i} collapsed={collapsed} badges={badges} />
          ))}
        </nav>
        <div className="shrink-0 border-t border-line px-2 pt-1 pb-3">
          <Group group={ADMIN_GROUP} index={1} collapsed={collapsed} badges={badges} />
          <ProfileCard compact={collapsed} />
        </div>
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[min(280px,85vw)] gap-0 border-none bg-sidebar p-0 shadow-[4px_0_24px_rgba(15,47,63,0.08)] lg:hidden">
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
          <nav className="flex-1 overflow-y-auto px-3 py-2">
            {[...MAIN_GROUPS, ADMIN_GROUP].map((g, i) => (
              <Group key={g.label ?? i} group={g} index={i} collapsed={false} badges={badges} onNavigate={close} mobile />
            ))}
          </nav>
          <div className="border-t border-line px-3 pt-3 pb-4">
            <ProfileCard />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
