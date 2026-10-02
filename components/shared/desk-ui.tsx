"use client";

/**
 * Desk building blocks — a port of the ServiceOps UI kit (page header,
 * KPI tiles, filter bar, list card, pills, detail tabs/cards, fields,
 * next-step strip, side drawer) onto shadcn/ui + Tailwind, in the Desk
 * palette. Every screen composes these so modules look like one product.
 */
import { useState, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { CaretDownIcon, CaretRightIcon, CheckIcon, HouseIcon, MagnifyingGlassIcon, PencilSimpleIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ── Tones ────────────────────────────────────────────────────────────

/** Icon-tile / KPI tones — the same semantic set ServiceOps uses, with Desk emerald-teal as the brand tone. */
export const TONES = {
  desk: { fg: "#0F9D7A", tint: "rgba(15, 157, 122, 0.10)" },
  depth: { fg: "#101828", tint: "rgba(16, 24, 40, 0.06)" },
  amber: { fg: "#F59E0B", tint: "rgba(245, 158, 11, 0.12)" },
  orange: { fg: "#F97316", tint: "rgba(249, 115, 22, 0.12)" },
  blue: { fg: "#3B82F6", tint: "rgba(59, 130, 246, 0.10)" },
  red: { fg: "#EF4444", tint: "rgba(239, 68, 68, 0.10)" },
  green: { fg: "#22C55E", tint: "rgba(34, 197, 94, 0.12)" },
  purple: { fg: "#8B5CF6", tint: "rgba(139, 92, 246, 0.10)" },
  gray: { fg: "#9CA3AF", tint: "rgba(156, 163, 175, 0.16)" },
} as const;
export type Tone = keyof typeof TONES;

export function IconTile({ tone, size = 40, children }: { tone: Tone; size?: number; children: ReactNode }) {
  const { fg, tint } = TONES[tone];
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-xl" style={{ width: size, height: size, backgroundColor: tint, color: fg }}>
      {children}
    </span>
  );
}

// ── Pills ────────────────────────────────────────────────────────────

export type PillTone = "teal" | "gray" | "blue" | "green" | "amber" | "orange" | "red" | "purple";
export const PILL_TONE: Record<PillTone, { fg: string; bg: string }> = {
  teal: { fg: "#0F9D7A", bg: "rgba(15,157,122,0.10)" },
  gray: { fg: "#6B7280", bg: "rgba(107,114,128,0.12)" },
  blue: { fg: "#2563EB", bg: "rgba(37,99,235,0.10)" },
  green: { fg: "#16A34A", bg: "rgba(22,163,74,0.10)" },
  amber: { fg: "#D97706", bg: "rgba(245,158,11,0.12)" },
  orange: { fg: "#EA580C", bg: "rgba(249,115,22,0.12)" },
  red: { fg: "#EF4444", bg: "rgba(239,68,68,0.10)" },
  purple: { fg: "#7C3AED", bg: "rgba(124,58,237,0.10)" },
};

/** Status pill — dot + label (ServiceOps job status pill). */
export function Pill({ tone, children, dot = true, className }: { tone: PillTone; children: ReactNode; dot?: boolean; className?: string }) {
  const m = PILL_TONE[tone];
  return (
    <span
      className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-badge whitespace-nowrap", className)}
      style={{ backgroundColor: m.bg, color: m.fg }}
    >
      {dot && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: m.fg }} aria-hidden />}
      {children}
    </span>
  );
}

// ── Page chrome ──────────────────────────────────────────────────────

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items, homeIcon = false }: { items: Crumb[]; homeIcon?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex min-w-0 items-center text-body text-ink-body", homeIcon ? "gap-3" : "gap-2")}>
      {homeIcon ? (
        <Link href="/" aria-label="Home" className="shrink-0 transition-colors hover:text-desk">
          <HouseIcon size={20} aria-hidden />
        </Link>
      ) : (
        <Link href="/" className="transition-colors hover:text-desk">
          Home
        </Link>
      )}
      {items.map((c, i) => (
        <span key={i} className={cn("flex min-w-0 items-center", homeIcon ? "gap-3" : "gap-2")}>
          <CaretRightIcon size={12} aria-hidden className="shrink-0 text-ink-muted" />
          {c.href ? (
            <Link href={c.href} className="whitespace-nowrap transition-colors hover:text-desk">
              {c.label}
            </Link>
          ) : (
            <span aria-current="page" className="truncate text-ink">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Listing page header — breadcrumb, title, one-line purpose, primary action. */
export function PageHeader({ title, subtitle, crumbs, actions }: { title: string; subtitle: string; crumbs?: Crumb[]; actions?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <Breadcrumb items={crumbs ?? [{ label: title }]} />
        <h1 className="mt-3 text-display font-bold tracking-tight text-ink sm:text-[36px] sm:leading-[44px]">{title}</h1>
        <p className="mt-1 text-body text-ink-body sm:text-[18px] sm:leading-[26px]">{subtitle}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 self-start sm:mb-3 sm:gap-3 sm:self-auto">{actions}</div>}
    </div>
  );
}

/** Page wrapper — the main padding every ServiceOps screen uses. */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 flex-1 space-y-5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8", className)}>{children}</div>;
}

// ── Buttons ──────────────────────────────────────────────────────────

type ButtonProps = ComponentProps<"button"> & { icon?: Icon };

/** Page-level CTA ("New ticket"). */
export function PrimaryButton({ children, icon: IconCmp, size = "lg", className, ...props }: ButtonProps & { size?: "lg" | "md" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-xl bg-desk text-button font-semibold whitespace-nowrap text-white shadow-[0_4px_14px_rgba(15,157,122,0.3)] transition-colors hover:bg-desk-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action disabled:pointer-events-none disabled:opacity-60",
        size === "lg" ? "h-12 px-6" : "h-10 px-4 text-button-sm",
        className,
      )}
    >
      {IconCmp && <IconCmp size={18} weight="bold" aria-hidden />}
      {children}
    </button>
  );
}

/** Solid detail-page action ("Reply" on a ticket — ServiceOps "Edit job"). */
export function DetailPrimaryButton({ children, icon: IconCmp, className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-lg bg-desk px-4 text-button-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-desk-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
    >
      {IconCmp && <IconCmp size={16} weight="bold" aria-hidden />}
      {children}
    </button>
  );
}

/** Outlined secondary action ("Edit", "Assign"). */
export function SecondaryButton({ children, icon: IconCmp, className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-card px-4 text-button-sm font-semibold whitespace-nowrap text-ink transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action disabled:pointer-events-none disabled:opacity-50 data-[state=open]:border-desk",
        className,
      )}
    >
      {IconCmp && <IconCmp size={16} weight="bold" aria-hidden />}
      {children}
    </button>
  );
}

/** Square outlined icon button (page "⋮", header utilities). */
export function IconButtonOutline({ children, className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-lg border border-line bg-card text-ink transition-colors hover:bg-desk-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action data-[state=open]:bg-desk-tint",
        className,
      )}
    >
      {children}
    </button>
  );
}

// ── KPI tiles (quick filters) ────────────────────────────────────────

export function KpiTile({
  label,
  value,
  tone,
  icon: IconCmp,
  weight = "fill",
  active,
  onClick,
  meta,
}: {
  label: string;
  value: ReactNode;
  tone: Tone;
  icon: Icon;
  weight?: "fill" | "bold" | "duotone";
  active?: boolean;
  onClick?: () => void;
  meta?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-2xl border bg-card px-3 py-4 text-left shadow-card transition-colors sm:gap-4 sm:px-4",
        active ? "border-desk ring-1 ring-desk" : "border-line-soft",
        onClick && "cursor-pointer hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action",
      )}
    >
      <IconTile tone={tone} size={48}>
        <IconCmp size={24} weight={weight} aria-hidden />
      </IconTile>
      <div className="min-w-0">
        <p className="truncate text-label font-normal text-ink-body">{label}</p>
        <p className="text-display font-bold text-ink">{value}</p>
        {meta && <p className="truncate text-caption text-ink-muted">{meta}</p>}
      </div>
    </Tag>
  );
}

/** KPI tiles: a grid on tablet/desktop, one swipeable strip on phones. */
export function KpiRow({ children, cols = "xl:grid-cols-6" }: { children: ReactNode; cols?: string }) {
  return (
    <div
      className={cn(
        "-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:min-w-[168px] [&>*]:snap-start sm:[&>*]:min-w-0",
        cols,
      )}
    >
      {children}
    </div>
  );
}

// ── List card + filters ──────────────────────────────────────────────

/** The white card that holds filters + table + pagination. */
export function ListCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-2xl border border-line-soft bg-card p-3 shadow-card sm:p-4", className)}>{children}</section>;
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  className,
  ...props
}: Omit<ComponentProps<"input">, "onChange" | "value"> & { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div
      className={cn(
        "flex h-11 items-center gap-2.5 rounded-xl border border-line-soft bg-desk-tint px-3.5 transition-colors focus-within:border-desk",
        className,
      )}
    >
      <MagnifyingGlassIcon size={18} aria-hidden className="shrink-0 text-ink-body" />
      <input
        {...props}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={props["aria-label"] ?? placeholder}
        className="min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange("")} className="text-ink-muted hover:text-ink">
          <XIcon size={14} weight="bold" aria-hidden />
        </button>
      )}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  /** Optional group heading shown above this option. */
  group?: string;
}

/**
 * Dropdown filter. `value === ""` is the "All …" reset state shown as
 * `placeholder`; the trigger turns to the brand colour when a value is set.
 * `variant="pill"` is the compact list-toolbar chip ("Status ⌄"); its reset
 * item reads `resetLabel` so the menu still says "Any status".
 */
export function FilterSelect({
  value,
  options,
  onChange,
  placeholder,
  icon,
  className,
  label,
  variant = "field",
  resetLabel,
}: {
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  placeholder: string;
  icon?: ReactNode;
  className?: string;
  label: string;
  variant?: "field" | "pill";
  resetLabel?: string;
}) {
  const active = value !== "";
  const current = options.find((o) => o.value === value)?.label ?? placeholder;
  const pill = variant === "pill";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${label}: ${active ? current : (resetLabel ?? placeholder)}`}
        className={cn(
          "flex items-center border bg-card text-ink transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action data-[state=open]:border-desk",
          pill ? "h-8 max-w-[200px] gap-1.5 rounded-lg px-2.5 text-[13px] font-medium" : "h-11 gap-2.5 rounded-xl px-3.5 text-body",
          active ? (pill ? "border-desk/40 bg-desk-tint text-desk" : "border-desk") : pill ? "border-line text-ink-body" : "border-line",
          className,
        )}
      >
        {icon}
        <span className={cn("flex-1 truncate text-left", icon && !active && "text-ink-muted")}>{current}</span>
        <CaretDownIcon size={pill ? 12 : 14} aria-hidden className={cn("shrink-0", active && pill ? "text-desk" : "text-ink-muted")} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[340px] w-auto min-w-[200px] rounded-xl">
        <DropdownMenuItem onSelect={() => onChange("")} className={cn("rounded-lg", !active && "bg-desk-tint")}>
          <span className="flex-1">{resetLabel ?? placeholder}</span>
          {!active && <CheckIcon size={14} aria-hidden className="text-desk" />}
        </DropdownMenuItem>
        {options.map((o, i) => {
          const header = o.group && o.group !== options[i - 1]?.group ? o.group : null;
          return (
            <div key={o.value}>
              {header && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-nav-group-label text-ink-muted uppercase">{header}</DropdownMenuLabel>
                </>
              )}
              <DropdownMenuItem onSelect={() => onChange(o.value)} className={cn("rounded-lg", o.value === value && "bg-desk-tint")}>
                <span className="flex-1">{o.label}</span>
                {o.value === value && <CheckIcon size={14} aria-hidden className="text-desk" />}
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Detail page language ─────────────────────────────────────────────

export function DetailTabs<T extends string>({
  tabs,
  active,
  onChange,
  actions,
  label,
}: {
  tabs: { key: T; label: string; count?: number }[];
  active: T;
  onChange: (k: T) => void;
  actions?: ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-b border-line lg:flex-row lg:items-center lg:gap-6">
      <div role="tablist" aria-label={label} className="scrollbar-none -mb-px flex items-center gap-1 overflow-x-auto sm:gap-3 xl:gap-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={active === t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-3.5 text-body whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-desk-action",
              active === t.key ? "border-desk font-semibold text-desk" : "border-transparent text-ink hover:text-desk",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center text-caption",
                  active === t.key ? "bg-desk-10 text-desk" : "bg-desk-tint text-ink-muted",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3 lg:ml-auto lg:pb-2">{actions}</div>}
    </div>
  );
}

export function DetailCard({
  icon: IconCmp,
  title,
  action,
  children,
  className,
  id,
}: {
  icon: Icon;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} aria-label={title} className={cn("min-w-0 rounded-2xl border border-line-soft bg-card p-4 shadow-card sm:p-5", className)}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconCmp size={24} aria-hidden className="shrink-0 text-desk" />
          <h2 className="truncate text-h2 font-bold text-ink">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function EditButton({ label = "Edit", icon: IconCmp = PencilSimpleIcon, className, ...props }: ComponentProps<"button"> & { label?: string; icon?: Icon }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-line bg-card px-3 text-button-sm font-semibold text-ink transition-colors hover:border-desk hover:text-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action",
        className,
      )}
    >
      <IconCmp size={16} weight="bold" aria-hidden />
      {label}
    </button>
  );
}

/** Label/value pair in a two-column definition grid (parent sets the columns). */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-body text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-body break-words text-ink">{children}</dd>
    </>
  );
}

export function IconField({ icon: IconCmp, label, children, labelClass = "text-body" }: { icon: Icon; label: string; children: ReactNode; labelClass?: string }) {
  return (
    <div className="grid grid-cols-[20px_minmax(96px,auto)_minmax(0,1fr)] items-center gap-x-3">
      <IconCmp size={18} aria-hidden className="text-desk" />
      <dt className={cn(labelClass, "whitespace-nowrap text-ink-muted")}>{label}</dt>
      <dd className="min-w-0 text-body break-words text-ink">{children}</dd>
    </div>
  );
}

/** "What happens next" strip. */
export function NextStep({ tone, label, action }: { tone: PillTone; label: ReactNode; action?: ReactNode }) {
  const m = PILL_TONE[tone];
  return (
    <div className="flex flex-col gap-2 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:gap-4" style={{ backgroundColor: m.bg }} role="status">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="shrink-0 text-caption font-semibold tracking-wide uppercase" style={{ color: m.fg }}>
          Next step
        </span>
        <span className="min-w-0 text-body text-ink">{label}</span>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/** Small outlined button used inside the next-step strip. */
export function StripButton({ children, className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border border-desk bg-card px-3 text-button-sm font-semibold text-desk transition-colors hover:bg-desk-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Activity timeline. */
export function Timeline({ items }: { items: { key: string; label: ReactNode; at: ReactNode; meta?: ReactNode }[] }) {
  return (
    <ol>
      {items.map((e, i) => (
        <li key={e.key} className="flex gap-3 sm:gap-4">
          <span className="w-24 shrink-0 pt-1.5 text-right text-caption text-ink-muted sm:w-32">{e.at}</span>
          <span className="flex shrink-0 flex-col items-center">
            <span className="mt-2 size-3 rounded-full border-2 border-desk bg-card" />
            {i < items.length - 1 && <span className="my-1 min-h-5 w-px flex-1 bg-line" />}
          </span>
          <div className="min-w-0 flex-1 pt-1 pb-5">
            <p className="text-body break-words text-ink">{e.label}</p>
            {e.meta && <p className="text-caption text-ink-muted">{e.meta}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Side drawer (create / edit / filters) ────────────────────────────

export function SideDrawer({
  open,
  onOpenChange,
  title,
  subtitle,
  icon: IconCmp,
  children,
  footer,
  width = 560,
  side = "right",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  subtitle?: string;
  icon: Icon;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  side?: "right" | "bottom";
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        showCloseButton={false}
        className={cn("gap-0 border-line p-0 shadow-[-12px_0_48px_rgba(16,24,40,0.10)]", side === "bottom" ? "max-h-[90dvh] rounded-t-2xl" : "w-full")}
        style={side === "right" ? { maxWidth: width } : undefined}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-desk-tint px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-desk text-white">
              <IconCmp size={18} weight="duotone" aria-hidden />
            </span>
            <div className="min-w-0">
              <SheetTitle className="truncate text-[16px] font-bold tracking-tight text-ink">{title}</SheetTitle>
              {subtitle ? (
                <SheetDescription className="truncate text-caption text-ink-muted">{subtitle}</SheetDescription>
              ) : (
                <SheetDescription className="sr-only">{title}</SheetDescription>
              )}
            </div>
          </div>
          <SheetClose
            aria-label="Close"
            className="inline-flex size-8 items-center justify-center rounded-[9px] border-[1.5px] border-line text-ink-muted transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-desk-action"
          >
            <XIcon size={17} weight="duotone" aria-hidden />
          </SheetClose>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex shrink-0 items-center justify-end gap-3 border-t border-line bg-desk-tint px-5 py-4 sm:px-6">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}

export function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-3.5 text-[12px] font-bold tracking-wider text-ink-muted uppercase">{title}</h3>
      {children}
    </div>
  );
}

/** Drawer footer buttons — text Cancel + teal submit. */
export function DrawerActions({ onCancel, submitLabel, disabled, onSubmit, submitType = "button" }: {
  onCancel: () => void;
  submitLabel: string;
  disabled?: boolean;
  onSubmit?: () => void;
  submitType?: "button" | "submit";
}) {
  return (
    <>
      <button type="button" onClick={onCancel} className="h-10 rounded-[9px] px-5 text-button font-semibold text-ink-muted transition-colors hover:bg-white hover:text-ink">
        Cancel
      </button>
      <button
        type={submitType}
        onClick={onSubmit}
        disabled={disabled}
        className="h-10 rounded-[9px] bg-desk px-6 text-button font-bold text-white shadow-[0_1px_8px_rgba(15,157,122,0.35)] transition-colors hover:bg-desk-press disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </>
  );
}

/** Form field shell — label above control, helper / error below (ServiceOps outlined fields). */
export function FormField({ label, htmlFor, error, children, className }: { label: string; htmlFor: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-field-label text-ink-body">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="ml-0.5 text-[0.71rem] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Outlined input / select trigger styling shared by every form. */
export const fieldClass =
  "h-11 w-full rounded-[10px] border-[1.5px] border-line bg-white px-3 text-[0.84rem] text-ink shadow-none transition-colors placeholder:text-ink-faint hover:border-desk focus-visible:border-desk focus-visible:ring-0 focus-visible:outline-none aria-invalid:border-destructive data-[state=open]:border-desk";

/** Search + filters. Phones get the search box and a "Filters" toggle instead of a wall of dropdowns. */
export function FilterBar({ search, children, trailing, activeCount = 0 }: { search: ReactNode; children?: ReactNode; trailing?: ReactNode; activeCount?: number }) {
  return <FilterBarInner search={search} trailing={trailing} activeCount={activeCount}>{children}</FilterBarInner>;
}

function FilterBarInner({ search, children, trailing, activeCount }: { search: ReactNode; children?: ReactNode; trailing?: ReactNode; activeCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 sm:flex-wrap">
        <div className="min-w-0 flex-1 sm:contents">{search}</div>
        {children && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-button-sm text-ink sm:hidden",
              activeCount ? "border-desk bg-desk-10" : "border-line bg-card",
            )}
          >
            Filters{activeCount ? ` · ${activeCount}` : ""}
            <CaretDownIcon size={12} aria-hidden className={cn("transition-transform", open && "rotate-180")} />
          </button>
        )}
        <div className="hidden sm:contents">
          {children}
          {trailing}
        </div>
      </div>
      {open && <div className="grid grid-cols-2 gap-2 sm:hidden [&>*]:!w-full [&>*]:!min-w-0">{children}{trailing}</div>}
    </div>
  );
}
