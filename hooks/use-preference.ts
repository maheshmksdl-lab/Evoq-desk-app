"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * A small per-browser UI preference (e.g. list density), kept in localStorage
 * and shared by every component that reads the same key. Falls back to
 * `initial` on the server and when storage is unavailable.
 */
export function usePreference<T extends string>(key: string, initial: T, allowed: readonly T[]) {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      const stored = read(key);
      return stored && (allowed as readonly string[]).includes(stored) ? (stored as T) : initial;
    },
    () => initial,
  );
  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        /* storage unavailable — keep the default */
      }
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [value, set] as const;
}
