import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const SIZES = {
  xs: { box: "size-5", text: "text-[9px]" },
  sm: { box: "size-6", text: "text-[10px]" },
  md: { box: "size-8", text: "text-xs" },
  lg: { box: "size-10", text: "text-sm" },
  xl: { box: "size-14", text: "text-base" },
} as const;

/**
 * Profile photo with an initials fallback (shown while loading or if the
 * image fails). Pass `name={null}` for "Unassigned".
 */
export function PersonAvatar({
  name,
  src,
  size = "md",
  status,
  className,
}: {
  name: string | null;
  src?: string | null;
  size?: keyof typeof SIZES;
  status?: "available" | "busy" | "away";
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} aria-hidden="true">
      {name ? (
        <Avatar className={cn("after:border-line-soft", SIZES[size].box)}>
          {src && <AvatarImage src={src} alt="" />}
          <AvatarFallback className={cn("bg-desk-10 font-bold text-ink", SIZES[size].text)}>{initials(name)}</AvatarFallback>
        </Avatar>
      ) : (
        <span className={cn("inline-flex items-center justify-center rounded-full border border-dashed border-ink-faint bg-white", SIZES[size].box)} />
      )}
      {status && (
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-white",
            status === "available" ? "bg-emerald-500" : status === "busy" ? "bg-amber-500" : "bg-slate-400",
          )}
        />
      )}
    </span>
  );
}
