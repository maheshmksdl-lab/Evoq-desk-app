"use client";

import { useSyncExternalStore } from "react";

/**
 * Shared clock for relative times and SLA countdowns. One interval for the
 * whole app; components re-render when it ticks.
 */
const TICK_MS = 30_000;
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot() {
  // Nothing subscribed yet (first render) — don't hand out a stale clock.
  if (!timer && Date.now() - now > TICK_MS) now = Date.now();
  return now;
}

export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
