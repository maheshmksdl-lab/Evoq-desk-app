"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

/** Sidebar state shared by the header (toggle) and the sidebar / content offset, plus the Quick actions palette. */
interface ShellState {
  collapsed: boolean;
  toggleCollapsed: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const ShellContext = createContext<ShellState | null>(null);

const KEY = "desk-sidebar-collapsed";
const listeners = new Set<() => void>();
function readCollapsed() {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}
function writeCollapsed(v: boolean) {
  try {
    localStorage.setItem(KEY, String(v));
  } catch {
    /* storage unavailable — keep in-memory only */
  }
  listeners.forEach((l) => l());
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const collapsed = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readCollapsed,
    () => false,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const toggleCollapsed = useCallback(() => writeCollapsed(!readCollapsed()), []);
  const value = useMemo(
    () => ({ collapsed, toggleCollapsed, drawerOpen, setDrawerOpen, paletteOpen, setPaletteOpen }),
    [collapsed, toggleCollapsed, drawerOpen, paletteOpen],
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside ShellProvider");
  return ctx;
}

/** Main content column, offset by the header and the (collapsible) desktop sidebar. */
export function ShellContent({ children }: { children: ReactNode }) {
  const { collapsed } = useShell();
  return (
    <div className="desk-content flex min-h-dvh flex-col" style={{ ["--sidebar-w" as string]: collapsed ? "68px" : "260px" }}>
      <main id="main" className="flex min-w-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
