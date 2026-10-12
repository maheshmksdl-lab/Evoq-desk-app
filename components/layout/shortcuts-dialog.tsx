"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { isApplePlatform } from "@/hooks/use-keyboard-shortcuts";
import { ACTION_IDS, ACTIONS, formatShortcut } from "@/lib/actions";
import { useRegisterAction } from "./actions-context";

/** Keys that work in the ticket list and workspace but aren't commands in the action list. */
const LIST_KEYS = [
  { keys: ["J"], label: "Next ticket in the queue" },
  { keys: ["K"], label: "Previous ticket in the queue" },
  { keys: ["Esc"], label: "Close the open ticket" },
];

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex gap-1">
      {keys.map((k) => (
        <kbd key={k} className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-line bg-muted px-1.5 font-sans text-[12px] text-ink-body">
          {k}
        </kbd>
      ))}
    </span>
  );
}

/** "?" — every keyboard shortcut, read from the shared action list so it never drifts from what the keys do. */
export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  useRegisterAction("shortcut-help", () => setOpen(true));
  const apple = open && isApplePlatform();
  const groups = (["General", "Ticket"] as const).map((group) => ({
    group,
    items: ACTION_IDS.filter((id) => ACTIONS[id].group === group && ACTIONS[id].shortcut).map((id) => ({ label: ACTIONS[id].label, keys: formatShortcut(ACTIONS[id].shortcut!, apple) })),
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 rounded-2xl p-0 sm:max-w-md">
        <div className="border-b border-line px-5 py-4">
          <DialogTitle className="text-[16px] font-bold text-ink">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="text-caption text-ink-muted">Shortcuts work anywhere outside a text field.</DialogDescription>
        </div>
        <div className="max-h-[65dvh] space-y-5 overflow-y-auto px-5 py-4">
          {[...groups, { group: "Ticket list" as const, items: LIST_KEYS }].map((g) => (
            <section key={g.group}>
              <h3 className="mb-2 text-[12px] font-bold tracking-wider text-ink-muted uppercase">{g.group === "Ticket" ? "On an open ticket" : g.group}</h3>
              <ul className="space-y-2">
                {g.items.map((i) => (
                  <li key={i.label} className="flex items-center justify-between gap-4 text-[14px] text-ink-body">
                    {i.label}
                    <Keys keys={i.keys} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
