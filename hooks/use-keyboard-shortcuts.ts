"use client";

import { useEffect, useRef } from "react";

export interface ShortcutBinding {
  /** "r", "?", "/", or "mod+k" (Ctrl on Windows/Linux, ⌘ on Apple). */
  key: string;
  handler: (e: KeyboardEvent) => void;
  /** Also fire while focus is in a text field — only for modifier shortcuts like mod+k. */
  allowInFields?: boolean;
}

const FIELD = "input, textarea, select, [contenteditable=''], [contenteditable='true']";
/** An open dialog, sheet or menu owns the keyboard; plain-key shortcuts stay quiet behind it. */
const OVERLAY = "[role='dialog'][data-state='open'], [role='menu'][data-state='open'], [role='listbox'][data-state='open']";

/** ⌘ on Apple devices, Ctrl elsewhere — for displaying "mod" shortcuts. Client-only. */
export function isApplePlatform() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function isTypingTarget(target: EventTarget | null) {
  return target instanceof Element && !!target.closest(FIELD);
}

function matches(binding: string, e: KeyboardEvent) {
  const parts = binding.toLowerCase().split("+");
  const key = parts.pop()!;
  const wantsMod = parts.includes("mod");
  const mod = e.metaKey || e.ctrlKey;
  if (wantsMod !== mod || e.altKey) return false;
  // "?" and "/" are typed with or without Shift depending on the layout, so compare the produced character.
  return e.key.toLowerCase() === key;
}

/**
 * Global key bindings for one component. Plain-key shortcuts never fire while
 * the agent is typing or while a dialog or menu is open; modifier shortcuts
 * can opt in with `allowInFields`.
 */
export function useKeyboardShortcuts(bindings: ShortcutBinding[], enabled = true) {
  const ref = useRef(bindings);
  useEffect(() => {
    ref.current = bindings;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing || e.repeat) return;
      for (const b of ref.current) {
        if (!matches(b.key, e)) continue;
        const plain = !b.key.includes("mod+");
        if (!b.allowInFields && isTypingTarget(e.target)) continue;
        if (plain && document.querySelector(OVERLAY)) continue;
        e.preventDefault();
        b.handler(e);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
