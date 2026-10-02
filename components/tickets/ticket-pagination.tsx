"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import { FilterSelect } from "@/components/shared/desk-ui";
import { PAGE_SIZES } from "@/lib/schemas/ticket";
import { cn } from "@/lib/utils";

/** 1 … 4 5 6 … 12 (ServiceOps page list). */
function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", current - 1, current, current + 1, "…", total];
}

const btn =
  "inline-flex size-9 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:border-desk disabled:opacity-40 disabled:hover:border-line focus-visible:outline-2 focus-visible:outline-desk-action";

export function TicketPagination({
  page,
  pageCount,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (s: (typeof PAGE_SIZES)[number]) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 pt-6 pb-2 sm:flex-row sm:px-2">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <p className="text-body text-ink-body" aria-live="polite">
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} tickets
        </p>
        <FilterSelect
          label="Rows per page"
          value={String(pageSize)}
          placeholder="25 per page (default)"
          options={PAGE_SIZES.map((s) => ({ value: String(s), label: `${s} per page` }))}
          onChange={(v) => onPageSize(Number(v || 25) as (typeof PAGE_SIZES)[number])}
          className="h-9 border-line px-3 text-body"
        />
      </div>
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => onPage(page - 1)} className={btn}>
            <CaretLeftIcon size={14} weight="bold" aria-hidden />
          </button>
          {pageList(page, pageCount).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="w-6 text-center text-body text-ink-muted" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "size-9 min-w-9 rounded-lg border text-button-sm transition-colors focus-visible:outline-2 focus-visible:outline-desk-action",
                  p === page ? "border-desk bg-desk-tint text-desk" : "border-line text-ink hover:border-desk",
                )}
              >
                {p}
              </button>
            ),
          )}
          <button type="button" aria-label="Next page" disabled={page === pageCount} onClick={() => onPage(page + 1)} className={btn}>
            <CaretRightIcon size={14} weight="bold" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
}
