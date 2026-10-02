const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "45m", "6h 18m", "3d 4h" — compact duration for SLA countdowns. */
export function formatDuration(ms: number): string {
  const mins = Math.max(1, Math.round(Math.abs(ms) / MIN));
  if (mins < 60) return `${mins}m`;
  if (mins < 24 * 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const hours = Math.round(mins / 60);
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return h ? `${d}d ${h}h` : `${d}d`;
}

/** "Due in 42m" / "Overdue by 2h 5m". */
export function formatDue(iso: string, now = Date.now()): string {
  const diff = Date.parse(iso) - now;
  return diff >= 0 ? `Due in ${formatDuration(diff)}` : `Overdue by ${formatDuration(diff)}`;
}

/** "just now", "12m ago", "3h ago", "2d ago", then a short date. */
export function formatRelative(iso: string, now = Date.now()): string {
  const diff = now - Date.parse(iso);
  if (diff < MIN) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const dateYearFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** "Today, 09:42 AM" / "Yesterday, 04:15 PM" / "Tomorrow, 08:30 AM" / "Sep 28, 11:02 AM". */
export function formatTimestamp(iso: string, now = Date.now()): string {
  const d = new Date(iso);
  const today = new Date(now);
  const dayDiff = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / DAY,
  );
  const time = timeFmt.format(d);
  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === -1) return `Yesterday, ${time}`;
  if (dayDiff === 1) return `Tomorrow, ${time}`;
  const date = d.getFullYear() === today.getFullYear() ? dateFmt.format(d) : dateYearFmt.format(d);
  return `${date}, ${time}`;
}

/** Full date for tooltips / title attributes. */
export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
