"use client";

import { useState, type ReactNode } from "react";
import { Command } from "cmdk";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowLeftIcon,
  BookOpenTextIcon,
  ChatTextIcon,
  CheckIcon,
  CircleHalfIcon,
  SirenIcon,
  TagIcon,
  UserCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { itemClass } from "@/components/layout/global-search";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { useSavedReplies } from "@/hooks/use-saved-replies";
import { useLookups } from "@/hooks/use-tickets";
import { KNOWLEDGE_ARTICLES, suggestArticles, type KnowledgeArticle } from "@/lib/mock-data/knowledge";
import { SUGGESTED_TAGS } from "@/lib/mock-data/tickets";
import { STATUS_META } from "@/lib/ticket-meta";
import { TICKET_STATUSES, type Agent, type Ticket, type TicketStatus } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

/** Which list the palette shows: the action list, or one action's choices. */
export type PaletteView = "root" | "assign" | "status" | "tag" | "reply" | "article" | "mention";

export interface PaletteHandlers {
  assign: (agentId: string | null) => void;
  setStatus: (status: TicketStatus) => void;
  toggleTag: (tag: string) => void;
  insertSavedReply: (id: string, body: string) => void;
  insertArticle: (article: KnowledgeArticle) => void;
  escalate: () => void;
  closeTicket: () => void;
  mention: (agent: Agent) => void;
}

const ROOT: { view?: Exclude<PaletteView, "root" | "mention">; run?: "escalate" | "closeTicket"; label: string; slash: string; icon: Icon }[] = [
  { view: "assign", label: "Assign to agent", slash: "/assign", icon: UserCircleIcon },
  { view: "status", label: "Change status", slash: "/status", icon: CircleHalfIcon },
  { view: "tag", label: "Add tag", slash: "/tag", icon: TagIcon },
  { view: "reply", label: "Insert saved reply", slash: "/reply", icon: ChatTextIcon },
  { view: "article", label: "Link knowledge article", slash: "/article", icon: BookOpenTextIcon },
  { run: "escalate", label: "Escalate ticket", slash: "/escalate", icon: SirenIcon },
  { run: "closeTicket", label: "Close ticket", slash: "/close", icon: XCircleIcon },
];

const TITLE: Record<Exclude<PaletteView, "root">, string> = {
  assign: "Assign to agent",
  status: "Change status",
  tag: "Add or remove tags",
  reply: "Insert saved reply",
  article: "Link knowledge article",
  mention: "Mention a teammate",
};

const PLACEHOLDER: Record<PaletteView, string> = {
  root: "Search actions…",
  assign: "Search agents…",
  status: "Search statuses…",
  tag: "Search tags…",
  reply: "Search saved replies…",
  article: "Search articles…",
  mention: "Search teammates…",
};

/**
 * The composer's command palette: "/" for ticket actions (assign, status,
 * tags, saved replies, articles, escalate, close) and "@" to mention a
 * teammate. Keyboard first — type to filter, arrows to move, Enter to run,
 * Backspace on an empty search to go back.
 */
export function ComposerPalette({
  ticket,
  view,
  onViewChange,
  query,
  onQueryChange,
  handlers,
  onDone,
}: {
  ticket: Ticket;
  view: PaletteView;
  onViewChange: (v: PaletteView) => void;
  query: string;
  onQueryChange: (q: string) => void;
  handlers: PaletteHandlers;
  /** Close the palette after an action ran. */
  onDone: () => void;
}) {
  const { data: lookups } = useLookups();
  const { data: savedReplies } = useSavedReplies();
  const [articlesAll] = useState(() => {
    const suggested = suggestArticles(ticket, 8);
    return [...suggested, ...KNOWLEDGE_ARTICLES.filter((a) => !suggested.includes(a))];
  });
  const done = (fn: () => void) => () => {
    fn();
    onDone();
  };
  const open = (v: PaletteView) => () => {
    onQueryChange("");
    onViewChange(v);
  };

  const item = (key: string, label: string, onSelect: () => void, lead: ReactNode, trail?: ReactNode, keywords?: string[]) => (
    <Command.Item key={key} value={`${key} ${label}`} keywords={keywords} onSelect={onSelect} className={cn(itemClass, "gap-2.5 py-1.5")}>
      <span className="flex size-5 shrink-0 items-center justify-center">{lead}</span>
      <span className="min-w-0 flex-1 truncate text-body text-ink">{label}</span>
      {trail}
    </Command.Item>
  );

  return (
    <Command loop className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3">
        {view === "root" || view === "mention" ? (
          <span className="text-body font-semibold text-ink-faint" aria-hidden>
            {view === "root" ? "/" : "@"}
          </span>
        ) : (
          <button type="button" onClick={open("root")} aria-label="Back to all actions" className="-ml-1 inline-flex size-6 items-center justify-center rounded text-ink-muted hover:bg-desk-tint hover:text-desk">
            <ArrowLeftIcon size={14} aria-hidden />
          </button>
        )}
        <Command.Input
          autoFocus
          value={query}
          onValueChange={onQueryChange}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !query && view !== "root" && view !== "mention") {
              e.preventDefault();
              onViewChange("root");
            }
          }}
          placeholder={PLACEHOLDER[view]}
          className="h-10 min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </div>
      {view !== "root" && <p className="px-3 pt-2 text-nav-group-label text-ink-muted uppercase">{TITLE[view]}</p>}
      <Command.List className="max-h-72 overflow-y-auto p-1.5 scrollbar-thin">
        <Command.Empty className="px-2.5 py-3 text-body text-ink-muted">No matches</Command.Empty>

        {view === "root" &&
          ROOT.map((a) =>
            item(
              a.slash,
              a.label,
              a.view ? open(a.view) : done(handlers[a.run!]),
              <a.icon size={16} aria-hidden className={a.run === "closeTicket" ? "text-ink-muted" : "text-desk"} />,
              <code className="font-mono text-[11px] text-ink-muted">{a.slash}</code>,
              [a.slash],
            ),
          )}

        {(view === "assign" || view === "mention") &&
          (lookups?.agents ?? [])
            .filter((a) => view === "assign" || a.id !== lookups?.currentAgentId)
            .map((a) =>
              item(
                a.id,
                a.id === lookups?.currentAgentId ? `${a.name} (me)` : a.name,
                view === "assign" ? done(() => handlers.assign(a.id)) : done(() => handlers.mention(a)),
                <PersonAvatar name={a.name} src={a.avatar} size="xs" status={a.status} />,
                view === "assign" && ticket.assignee?.id === a.id ? <CheckIcon size={14} aria-hidden className="text-desk" /> : <span className="text-caption text-ink-muted">{a.role}</span>,
              ),
            )}
        {view === "assign" && ticket.assignee && item("unassigned", "Unassigned", done(() => handlers.assign(null)), <PersonAvatar name={null} size="xs" />)}

        {view === "status" &&
          TICKET_STATUSES.map((s) =>
            item(
              s,
              STATUS_META[s].label,
              done(() => handlers.setStatus(s)),
              <span className={cn("size-2 rounded-full", STATUS_META[s].dot)} />,
              ticket.status === s ? <CheckIcon size={14} aria-hidden className="text-desk" /> : undefined,
            ),
          )}

        {view === "tag" &&
          [...new Set([...ticket.tags, ...SUGGESTED_TAGS])].map((t) =>
            item(
              t,
              t,
              done(() => handlers.toggleTag(t)),
              <TagIcon size={14} aria-hidden className="text-ink-muted" />,
              ticket.tags.includes(t) ? <CheckIcon size={14} aria-hidden className="text-desk" /> : undefined,
            ),
          )}

        {view === "reply" &&
          (savedReplies ?? []).map((r) =>
            item(r.id, r.name, done(() => handlers.insertSavedReply(r.id, r.body)), <ChatTextIcon size={15} aria-hidden className="text-ink-muted" />, (
              <code className="font-mono text-[11px] text-ink-muted">{r.shortcut}</code>
            ), [r.shortcut, r.category]),
          )}

        {view === "article" &&
          articlesAll.map((a) =>
            item(a.id, a.title, done(() => handlers.insertArticle(a)), <BookOpenTextIcon size={15} aria-hidden className="text-ink-muted" />, undefined, a.keywords),
          )}
      </Command.List>
    </Command>
  );
}
