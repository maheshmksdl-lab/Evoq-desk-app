"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Report charts. Colours are validated categorical slots (blue / orange,
 * worst adjacent CVD ΔE 24.7) for the two-series volume chart, and the Desk
 * teal for single-series bars. Text always wears ink tokens; colour only
 * marks identity, and every chart has a legend or direct labels.
 */
export const SERIES = { created: "#2a78d6", resolved: "#eb6834" } as const;
const BAR = "#0F9D7A";

export interface VolumePoint {
  label: string;
  created: number;
  resolved: number;
}

function niceMax(n: number) {
  if (n <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / step) * step;
}

/** Created vs resolved over time: 2px lines, crosshair + tooltip on hover, keyboard steppable. */
export function VolumeChart({ data }: { data: VolumePoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  // Drawn at the container's real width so axis text stays 11px instead of scaling with the viewBox.
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 240;
  const pad = { l: 32, r: 12, t: 12, b: 28 };
  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.created, d.resolved))));
  const x = (i: number) => pad.l + (data.length === 1 ? 0 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const path = (k: "created" | "resolved") => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join(" ");
  const ticks = [0, max / 2, max];
  // About one date label per 90px; the last one is always shown, so drop a regular label too close to it.
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(W / 90))));
  const showLabel = (i: number) => i === data.length - 1 || (i % labelEvery === 0 && data.length - 1 - i >= labelEvery / 2 + 0.5);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
    setActive(Math.max(0, Math.min(data.length - 1, i)));
  };

  const point = active !== null ? data[active] : null;
  return (
    <div ref={wrap} className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block max-w-full touch-none overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-desk-action"
        role="img"
        aria-label={`Tickets created and resolved, ${data[0]?.label} to ${data[data.length - 1]?.label}`}
        tabIndex={0}
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1));
          if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? data.length) - 1));
          if (e.key === "Escape") setActive(null);
        }}
        onBlur={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#EEF0F3" strokeWidth={1} />
            <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-[#667085] text-[11px]">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          showLabel(i) ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="fill-[#667085] text-[11px]">
              {d.label}
            </text>
          ) : null,
        )}
        {active !== null && <line x1={x(active)} x2={x(active)} y1={pad.t} y2={H - pad.b} stroke="#98A2B3" strokeWidth={1} strokeDasharray="3 3" />}
        <path d={path("created")} fill="none" stroke={SERIES.created} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={path("resolved")} fill="none" stroke={SERIES.resolved} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active !== null &&
          (["created", "resolved"] as const).map((k) => <circle key={k} cx={x(active)} cy={y(data[active][k])} r={4.5} fill={SERIES[k]} stroke="#fff" strokeWidth={2} />)}
      </svg>
      {point && active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-2 z-10 min-w-[140px] rounded-xl border border-line bg-card px-3 py-2 shadow-pop"
          style={{ left: `${(x(active) / W) * 100}%`, transform: `translateX(${active > data.length / 2 ? "calc(-100% - 12px)" : "12px"})` }}
        >
          <p className="text-[12px] font-semibold text-ink">{point.label}</p>
          {(["created", "resolved"] as const).map((k) => (
            <p key={k} className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-body">
              <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: SERIES[k] }} aria-hidden />
              <span className="flex-1 capitalize">{k}</span>
              <span className="font-semibold text-ink tabular-nums">{point[k]}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: number }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-[13px] text-ink-body">
          <span className="h-[3px] w-4 rounded-full" style={{ backgroundColor: i.color }} aria-hidden />
          {i.label}
          {i.value !== undefined && <span className="font-semibold text-ink tabular-nums">{i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Ranked horizontal bars, one hue, value and share labelled on every row; hover highlights a row. */
export function BarList({ rows, total, onSelect }: { rows: { key: string; label: string; count: number }[]; total: number; onSelect?: (key: string) => void }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!total) return <p className="py-6 text-center text-body text-ink-muted">No tickets in this period.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const share = Math.round((r.count / total) * 100);
        const Tag = onSelect ? "button" : "div";
        return (
          <li key={r.key}>
            <Tag
              {...(onSelect ? { type: "button" as const, onClick: () => onSelect(r.key) } : {})}
              title={`${r.label}: ${r.count} (${share}%)`}
              className={cn("group block w-full rounded-lg text-left", onSelect && "focus-visible:outline-2 focus-visible:outline-desk-action")}
            >
              <span className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className={cn("truncate text-ink-body", onSelect && "group-hover:text-desk")}>{r.label}</span>
                <span className="shrink-0 text-ink-muted tabular-nums">
                  <span className="font-semibold text-ink">{r.count}</span> · {share}%
                </span>
              </span>
              <span className="mt-1 block h-2 overflow-hidden rounded-full bg-[#F2F4F7]">
                <span className="block h-full rounded-full transition-[width,opacity] group-hover:opacity-80" style={{ width: `${(r.count / max) * 100}%`, backgroundColor: BAR }} />
              </span>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}

/** Met share of a target — a small meter with the percentage spelled out. */
export function Meter({ met, total }: { met: number; total: number }) {
  const value = total ? Math.round((met / total) * 100) : null;
  const tone = value === null ? "#D0D5DD" : value >= 90 ? "#16A34A" : value >= 75 ? "#D97706" : "#EF4444";
  return (
    <span className="flex items-center gap-2.5">
      <span className="h-2 w-20 overflow-hidden rounded-full bg-[#F2F4F7]" aria-hidden>
        <span className="block h-full rounded-full" style={{ width: `${value ?? 0}%`, backgroundColor: tone }} />
      </span>
      <span className="text-[13px] text-ink tabular-nums">{value === null ? "—" : `${value}%`}</span>
      <span className="text-[12px] text-ink-muted tabular-nums">
        {met}/{total}
      </span>
    </span>
  );
}
