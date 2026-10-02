"use client";

import { useNow } from "@/hooks/use-now";
import { formatFullDate, formatRelative, formatTimestamp } from "@/lib/format";

/** Accessible timestamp: relative or absolute text, full date on hover. */
export function TimeLabel({
  iso,
  mode = "relative",
  className,
}: {
  iso: string;
  mode?: "relative" | "timestamp";
  className?: string;
}) {
  const now = useNow();
  return (
    <time dateTime={iso} title={formatFullDate(iso)} className={className}>
      {mode === "relative" ? formatRelative(iso, now) : formatTimestamp(iso, now)}
    </time>
  );
}
