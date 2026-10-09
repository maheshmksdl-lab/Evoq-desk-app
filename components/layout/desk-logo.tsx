import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The EVOQ Desk logo (mark + wordmark), from public/media. Size it with a height class; width follows. */
export function DeskLogoImage({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/media/evoq-desk-logo-1.png"
      alt="EVOQ Desk"
      width={135}
      height={55}
      priority={priority}
      className={cn("h-8 w-auto shrink-0 select-none", className)}
      draggable={false}
    />
  );
}

/** App logo in the header and navigation drawer — links to Overview, the home page. */
export function DeskLogo({ className }: { className?: string }) {
  return (
    <Link href="/overview" className={cn("inline-flex shrink-0 items-center rounded-md", className)} aria-label="EVOQ Desk — go to Overview">
      <DeskLogoImage priority />
    </Link>
  );
}
