"use client";

/**
 * Pieces shared by the modules around the ticket workspace (Customers,
 * Knowledge, Reports, Automations, Settings, Notifications). They follow the
 * Overview's language: 28px page title, white rounded-2xl cards on the grey
 * page, 12px muted table headings, teal for anything interactive.
 */
import { useCallback, useState, type ReactNode } from "react";
import { ArrowDownIcon, ArrowUpIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Open state for a create/edit drawer. `key` changes on every open, so the
 * form remounts empty (or with the record being edited).
 */
export function useDrawer<T = undefined>() {
  const [state, setState] = useState<{ open: boolean; key: number; item?: T }>({ open: false, key: 0 });
  const show = useCallback((item?: T) => setState((s) => ({ open: true, key: s.key + 1, item })), []);
  const setOpen = useCallback((open: boolean) => setState((s) => ({ ...s, open })), []);
  return { ...state, show, setOpen };
}

/** Page title row — same type scale as the Overview header. */
export function ModuleHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-9 font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-[15px] leading-6 text-ink-muted">{subtitle}</p>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:gap-3">{actions}</div>}
    </div>
  );
}

/** White card with an optional title row (Overview card). */
export function Panel({ title, action, children, className, bodyClassName }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section aria-label={title} className={cn("min-w-0 rounded-2xl border border-line-soft bg-card shadow-card", className)}>
      {title && (
        <header className="flex items-center gap-3 px-5 pt-5 pb-2">
          <h2 className="truncate text-[17px] leading-6 font-semibold text-ink">{title}</h2>
          {action && <div className="ml-auto shrink-0">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export const headCell = "px-3 py-2.5 text-left text-[12px] leading-4 font-medium text-ink-muted whitespace-nowrap border-b border-line bg-card first:pl-5 last:pr-5";
export const bodyCell = "px-3 py-3 border-b border-line-soft align-middle text-[14px] leading-5 text-ink-body first:pl-5 last:pr-5";

/** Clickable column heading: first click sorts by it, a second flips direction when the column allows both. */
export function SortableHead<S extends string>({
  label,
  desc,
  asc,
  sort,
  onSort,
  className,
}: {
  label: string;
  desc: S;
  asc?: S;
  sort: S;
  onSort: (s: S) => void;
  className?: string;
}) {
  const active = sort === desc || sort === asc;
  const isAsc = sort === asc;
  const next = active && !isAsc && asc ? asc : desc;
  const SortIcon = isAsc ? ArrowUpIcon : ArrowDownIcon;
  return (
    <th scope="col" aria-sort={active ? (isAsc ? "ascending" : "descending") : undefined} className={cn(headCell, className)}>
      <button type="button" onClick={() => onSort(next)} className={cn("inline-flex items-center gap-1 transition-colors hover:text-desk", active && "text-ink")}>
        {label}
        <SortIcon size={12} weight="bold" aria-hidden className={active ? "text-desk" : "opacity-0"} />
      </button>
    </th>
  );
}

/** On/off switch (role="switch"). */
export function Switch({ checked, onChange, label, disabled, className }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action disabled:opacity-50",
        checked ? "bg-desk" : "bg-[#D0D5DD]",
        className,
      )}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}

/** Segmented tabs used inside a page (Customers | Contacts). */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-xl border border-line bg-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-desk-action",
            value === o.value ? "bg-desk-tint text-desk" : "text-ink-body hover:text-ink",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="text-[12px] text-ink-muted tabular-nums">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** "Are you sure?" for destructive actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl p-0 sm:max-w-md">
        <div className="flex gap-4 p-5">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#EF4444]">
            <WarningIcon size={20} weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-[16px] font-bold text-ink">{title}</DialogTitle>
            <DialogDescription className="mt-1 text-body text-ink-muted">{description}</DialogDescription>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-line bg-desk-surface px-5 py-3.5">
          <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-[9px] px-5 text-button font-semibold text-ink-muted transition-colors hover:bg-white hover:text-ink">
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="h-10 rounded-[9px] bg-[#EF4444] px-5 text-button font-bold text-white transition-colors hover:bg-[#DC2626] disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Downloads rows as a CSV file (Reports, Customers export). */
export function downloadCsv(filename: string, header: string[], rows: (string | number | null)[][]) {
  const cell = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
