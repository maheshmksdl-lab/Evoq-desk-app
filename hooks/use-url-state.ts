"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Page state (search, filters, tab, page) kept in the query string, the way
 * ticket queues are: shareable, kept on refresh, and back/forward friendly.
 * Values equal to their default are left out of the URL. Updates go through
 * the History API, which Next keeps in step with useSearchParams.
 */
export function useUrlState<T extends Record<string, string | number>>(defaults: T) {
  const pathname = usePathname();
  const params = useSearchParams();
  const key = JSON.stringify(defaults);

  const state = useMemo(() => {
    const base = JSON.parse(key) as T;
    const out = { ...base };
    for (const k of Object.keys(base) as (keyof T)[]) {
      const raw = params.get(k as string);
      if (raw === null) continue;
      if (typeof base[k] === "number") {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) out[k] = n as T[keyof T];
      } else out[k] = raw as T[keyof T];
    }
    return out;
  }, [params, key]);

  const setState = useCallback(
    (patch: Partial<T>, { push = false }: { push?: boolean } = {}) => {
      const base = JSON.parse(key) as T;
      // Changing anything other than the page goes back to page 1.
      const next = { ...state, ...patch, ...("page" in base && !("page" in patch) ? { page: 1 } : {}) };
      const qs = new URLSearchParams(window.location.search);
      for (const k of Object.keys(base)) {
        const v = next[k as keyof T];
        if (v === base[k] || v === "") qs.delete(k);
        else qs.set(k, String(v));
      }
      const href = `${pathname}${qs.size ? `?${qs}` : ""}`;
      if (href === `${window.location.pathname}${window.location.search}`) return;
      window.history[push ? "pushState" : "replaceState"](null, "", href);
    },
    [state, key, pathname],
  );

  return [state, setState] as const;
}
