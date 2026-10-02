"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ACTION_IDS, ACTIONS, type ActionId } from "@/lib/actions";

/** Return `false` to pass the action to the next handler down the stack (e.g. a hidden search field). */
type Handler = () => void | boolean;

interface ActionsState {
  register: (id: ActionId, handler: { current: Handler }) => () => void;
  run: (id: ActionId) => boolean;
  /** Actions with at least one handler mounted right now, in registry order. */
  available: ActionId[];
}

const ActionsContext = createContext<ActionsState | null>(null);

/**
 * Runtime half of the action list (`lib/actions.ts`): screens register what
 * they can do, and both the keyboard shortcuts and the command menu run
 * actions through here. The most recently mounted handler wins.
 */
export function ActionsProvider({ children }: { children: ReactNode }) {
  const handlers = useRef(new Map<ActionId, { current: Handler }[]>());
  const [available, setAvailable] = useState<ActionId[]>([]);

  const sync = useCallback(() => setAvailable(ACTION_IDS.filter((id) => handlers.current.get(id)?.length)), []);

  const register = useCallback(
    (id: ActionId, handler: { current: Handler }) => {
      const stack = handlers.current.get(id) ?? [];
      handlers.current.set(id, [...stack, handler]);
      sync();
      return () => {
        handlers.current.set(id, (handlers.current.get(id) ?? []).filter((h) => h !== handler));
        sync();
      };
    },
    [sync],
  );

  const run = useCallback((id: ActionId) => {
    const stack = handlers.current.get(id) ?? [];
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].current() !== false) return true;
    }
    return false;
  }, []);

  useKeyboardShortcuts(
    ACTION_IDS.flatMap((id) => {
      const { shortcut } = ACTIONS[id];
      if (!shortcut || !available.includes(id)) return [];
      return [{ key: shortcut, handler: () => void run(id), allowInFields: shortcut.startsWith("mod+") }];
    }),
  );

  const value = useMemo(() => ({ register, run, available }), [register, run, available]);
  return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>;
}

export function useActions() {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error("useActions must be used inside ActionsProvider");
  return ctx;
}

/** Makes `id` available (shortcut + command menu) while the calling component is mounted. */
export function useRegisterAction(id: ActionId, handler: Handler, enabled = true) {
  const { register } = useActions();
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => (enabled ? register(id, ref) : undefined), [id, enabled, register]);
}
