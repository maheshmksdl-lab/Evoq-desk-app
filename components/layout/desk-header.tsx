"use client";

import { ListIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNewTicket } from "@/components/tickets/new-ticket-dialog";
import { DeskLogo } from "./desk-logo";
import { HeaderSearch, MobileSearch } from "./global-search";
import { NotificationsMenu } from "./notifications-menu";
import { useShell } from "./shell-context";
import { UserMenu } from "./user-menu";

/** Bordered utility button — the slot ServiceOps uses for its theme toggle. */
function CreateButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label="Create a ticket"
          className="inline-flex size-[34px] items-center justify-center rounded-[9px] border-[1.5px] border-line bg-white text-ink-muted transition-all hover:bg-desk-tint hover:text-desk focus-visible:outline-2 focus-visible:outline-desk-action"
        >
          <PlusIcon size={17} weight="bold" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>Create a ticket</TooltipContent>
    </Tooltip>
  );
}

export function DeskHeader() {
  const { collapsed, toggleCollapsed, setDrawerOpen } = useShell();
  const { openNewTicket } = useNewTicket();

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-line bg-white lg:h-[72px]">
      {/* Phones / tablets: menu button opens the navigation drawer */}
      <div className="flex shrink-0 items-center gap-3 pl-4 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-ink transition-all hover:bg-desk-tint hover:text-desk"
        >
          <ListIcon size={20} weight="bold" aria-hidden />
        </button>
        <DeskLogo className="hidden sm:inline-flex" />
      </div>

      {/* Desktop: hamburger + logo in a column matching the expanded sidebar */}
      <div className="hidden w-[260px] shrink-0 items-center gap-3 px-3 lg:flex">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink transition-all hover:bg-desk-tint hover:text-desk"
        >
          <ListIcon size={18} weight="bold" aria-hidden />
        </button>
        <DeskLogo />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-3 px-4 lg:gap-8 lg:px-8">
        <div className="hidden lg:block">
          <HeaderSearch />
        </div>
        <MobileSearch />
        <CreateButton onClick={openNewTicket} />
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}
