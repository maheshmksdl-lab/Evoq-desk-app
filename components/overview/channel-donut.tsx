"use client";

import { useState } from "react";
import type { TicketSource } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

/**
 * Channel groups in a fixed order — colour follows the channel, never its rank.
 * Blue and purple are close for colour-blind readers, so the legend always
 * names every slice with its count and share.
 */
const CHANNELS: { key: string; label: string; color: string; sources: TicketSource[] }[] = [
  { key: "email", label: "Email", color: "#0F9D7A", sources: ["email"] },
  { key: "web", label: "Web", color: "#2563EB", sources: ["web_form", "portal"] },
  { key: "chat", label: "Chat", color: "#A855F7", sources: ["chat"] },
  { key: "api", label: "API", color: "#F43F5E", sources: ["api"] },
  { key: "other", label: "Other", color: "#9CA3AF", sources: ["phone", "social"] },
];

const SIZE = 132;
const STROKE = 22;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
/** Surface gap between slices, in px along the ring. */
const GAP = 2;

/** Tickets by channel: donut with the total in the hole, plus a legend of count and share. */
export function ChannelDonut({ channels, caption }: { channels: { source: TicketSource; count: number }[]; caption: string }) {
  const [active, setActive] = useState<string | null>(null);
  const rows = CHANNELS.map((c) => ({ ...c, count: channels.filter((x) => c.sources.includes(x.source)).reduce((n, x) => n + x.count, 0) }));
  const total = rows.reduce((n, r) => n + r.count, 0);
  const share = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const visible = rows.filter((r) => r.count > 0);
  const focus = rows.find((r) => r.key === active);

  const lengths = visible.map((r) => (r.count / total) * CIRC);
  const arcs = visible.map((r, i) => ({
    ...r,
    dash: Math.max(lengths[i] - (visible.length > 1 ? GAP : 0), 0.5),
    offset: lengths.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={`${total} tickets by channel: ${rows.map((r) => `${r.label} ${r.count}`).join(", ")}`}
          className="-rotate-90"
        >
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--border-soft)" strokeWidth={STROKE} />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={active === a.key ? STROKE + 4 : STROKE}
              strokeDasharray={`${a.dash} ${CIRC - a.dash}`}
              strokeDashoffset={-a.offset}
              opacity={active && active !== a.key ? 0.35 : 1}
              className="cursor-default transition-[opacity,stroke-width] duration-150"
              onPointerEnter={() => setActive(a.key)}
              onPointerLeave={() => setActive(null)}
            >
              <title>{`${a.label}: ${a.count} (${share(a.count)}%)`}</title>
            </circle>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden>
          <span className="text-display font-bold text-ink tabular-nums">{focus ? focus.count : total}</span>
          <span className="text-2xs text-ink-muted">{focus ? focus.label : "Total"}</span>
          <span className="text-2xs text-ink-muted">{focus ? `${share(focus.count)}%` : caption}</span>
        </div>
      </div>

      <table className="w-full max-w-60 text-body text-ink-body">
        <caption className="sr-only">Tickets by channel</caption>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.key}
              onPointerEnter={() => r.count && setActive(r.key)}
              onPointerLeave={() => setActive(null)}
              className={cn("transition-opacity", active && active !== r.key && "opacity-50")}
            >
              <th scope="row" className="py-1 pr-3 text-left font-normal">
                <span className="inline-flex items-center gap-2.5">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} aria-hidden />
                  {r.label}
                </span>
              </th>
              <td className="py-1 pr-3 text-right tabular-nums">{r.count}</td>
              <td className="py-1 text-right text-ink-muted tabular-nums">{share(r.count)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
