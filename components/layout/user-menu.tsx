"use client";

import { useState } from "react";
import { KeyboardIcon, SignOutIcon, UserCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AGENTS, CURRENT_AGENT_ID, TEAMS } from "@/lib/mock-data/agents";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { cn } from "@/lib/utils";

type Availability = "available" | "busy" | "away";
const AVAILABILITY: { value: Availability; label: string; dot: string }[] = [
  { value: "available", label: "Available", dot: "bg-emerald-400" },
  { value: "busy", label: "Busy", dot: "bg-amber-400" },
  { value: "away", label: "Away", dot: "bg-slate-400" },
];

const me = AGENTS.find((a) => a.id === CURRENT_AGENT_ID)!;
const myTeam = TEAMS.find((t) => t.id === me.teamId)!;

const item = "gap-4 rounded-[10px] px-3.5 py-2.5 text-[0.875rem] font-medium text-ink focus:bg-desk-tint focus:text-desk";

/** Avatar → account menu (ServiceOps user menu). */
export function UserMenu() {
  const [availability, setAvailability] = useState<Availability>(me.status);
  const notInPreview = () => toast.info("Not available in this preview", { description: "Account settings arrive with the Admin module." });
  const dot = AVAILABILITY.find((a) => a.value === availability)!.dot;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${me.name}`}
        className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full ring-2 ring-transparent transition-all hover:ring-desk-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
      >
        <PersonAvatar name={me.name} src={me.avatar} size="md" />
        <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-white", dot)} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-60 overflow-hidden rounded-2xl border border-line p-0 shadow-pop">
        <div className="px-5 pt-4 pb-3">
          <p className="text-[15px] leading-tight font-bold text-ink">{me.name}</p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            {me.role} · {myTeam.name}
          </p>
        </div>
        <DropdownMenuSeparator className="mx-0 my-0 bg-line" />
        <div className="p-1.5">
          <DropdownMenuLabel className="px-3.5 pt-1.5 pb-1 text-nav-group-label text-ink-muted uppercase">Availability</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={availability} onValueChange={(v) => setAvailability(v as Availability)}>
            {AVAILABILITY.map((a) => (
              <DropdownMenuRadioItem key={a.value} value={a.value} className={cn(item, "gap-3")}>
                <span className={cn("size-2 rounded-full", a.dot)} aria-hidden />
                {a.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </div>
        <DropdownMenuSeparator className="mx-0 my-0 bg-line" />
        <div className="p-1.5">
          <DropdownMenuItem onSelect={notInPreview} className={item}>
            <UserCircleIcon size={18} weight="duotone" aria-hidden /> My account
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => toast("Keyboard shortcuts", { description: "Ctrl K or / — search Desk. On a ticket: R — reply, N — internal note." })}
            className={item}
          >
            <KeyboardIcon size={18} weight="duotone" aria-hidden /> Keyboard shortcuts
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={notInPreview} className={cn(item, "text-[#ef4444] focus:text-[#dc2626] [&_svg]:text-current")}>
            <SignOutIcon size={18} weight="duotone" aria-hidden /> Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
