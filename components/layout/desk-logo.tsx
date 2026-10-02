import Link from "next/link";
import { cn } from "@/lib/utils";

/** Desk wordmark: brand tile + name (ServiceOps logo lockup, Desk colours). */
export function DeskLogo({ className }: { className?: string }) {
  return (
    <Link href="/tickets" className={cn("inline-flex shrink-0 items-center gap-2 rounded-md", className)} aria-label="Desk — go to tickets">
      <svg viewBox="0 0 28 28" className="size-7 shrink-0" aria-hidden>
        <rect width="28" height="28" rx="7" fill="var(--desk)" />
        <path
          d="M8 9.5A1.5 1.5 0 0 1 9.5 8h9A1.5 1.5 0 0 1 20 9.5v2.25a2.25 2.25 0 0 0 0 4.5v2.25a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 8 18.5v-2.25a2.25 2.25 0 0 0 0-4.5Z"
          fill="#fff"
        />
        <path d="M12 12h4M12 16h2.5" stroke="var(--desk)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="text-[19px] font-semibold tracking-tight text-ink">Desk</span>
    </Link>
  );
}
