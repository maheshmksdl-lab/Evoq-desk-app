"use client";

import { useImperativeHandle, useRef, useState, type ReactNode, type Ref, type RefObject } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  AtIcon,
  BookOpenTextIcon,
  CaretDownIcon,
  DotsThreeIcon,
  LinkSimpleIcon,
  ListBulletsIcon,
  PaperclipIcon,
  TextBIcon,
  TextItalicIcon,
  TrashIcon,
  WarningIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAddMessage } from "@/hooks/use-ticket";
import { useRecordSavedReplyUse, useSavedReplies } from "@/hooks/use-saved-replies";
import { useAnnouncePresence } from "@/hooks/use-presence";
import { CURRENT_AGENT_ID } from "@/lib/mock-data/agents";
import type { KnowledgeArticle } from "@/lib/mock-data/knowledge";
import { attachmentDraftSchema, composerSchema } from "@/lib/schemas/ticket";
import { STATUS_META } from "@/lib/ticket-meta";
import type { Ticket, TicketStatus } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { AttachmentList } from "./attachment-list";
import { ComposerPalette, type PaletteView } from "./composer-palette";
import { useTicketActions } from "./ticket-actions";
import { joinNames, useOthers } from "./ticket-presence";

export type ComposerMode = "public" | "internal";
type Draft = { name: string; size: number; mimeType: string };

/** Lets the workspace put text into the draft (a suggested article, a quoted message). */
export interface ComposerHandle {
  insert: (text: string) => void;
}

const SEND_AND_SET: TicketStatus[] = ["pending", "resolved", "closed"];

/** "/" or "@" typed at the start of a word opens the palette. */
const atWordStart = (value: string, caret: number) => caret === 0 || /\s/.test(value[caret - 1]);

/** Markdown link for an article — rendered as a link in the thread. */
export const articleLink = (a: KnowledgeArticle) => `[${a.title}](${a.url})`;

/**
 * Reply / internal note composer. Type "/" for ticket actions or "@" to
 * mention a teammate. Sending appends to the mock thread only — no email is
 * delivered. Ctrl/⌘ + Enter sends.
 */
export function TicketComposer({
  ticket,
  mode,
  onModeChange,
  textareaRef,
  handle,
  onSent,
}: {
  ticket: Ticket;
  mode: ComposerMode;
  onModeChange: (m: ComposerMode) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  handle?: Ref<ComposerHandle>;
  onSent?: () => void;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const send = useAddMessage(ticket.id);
  const actions = useTicketActions(ticket);
  const { data: savedReplies } = useSavedReplies();
  const recordUse = useRecordSavedReplyUse();
  const internal = mode === "internal";
  const firstName = ticket.contact.name.split(" ")[0];

  // ── Command palette ("/" actions, "@" mentions) ──
  const [palette, setPalette] = useState<{ view: PaletteView; trigger: "/" | "@" | null; caret: number } | null>(null);
  const [paletteQuery, setPaletteQuery] = useState("");
  const openPalette = (view: PaletteView, trigger: "/" | "@" | null) => {
    setPaletteQuery("");
    setPalette({ view, trigger, caret: textareaRef.current?.selectionStart ?? body.length });
  };

  // ── Collision awareness: warn softly, never block ──
  const [focused, setFocused] = useState(false);
  const [continued, setContinued] = useState(false);
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const [draftSince, setDraftSince] = useState<string | null>(null);
  const [dismissedReplyId, setDismissedReplyId] = useState<string | null>(null);
  const others = useOthers(ticket.id);
  const replying = others.filter((o) => o.typing === "reply").map((o) => o.agent);
  useAnnouncePresence(ticket.id, body.trim() ? (internal ? "note" : "reply") : null);

  const showReplyingWarning = !internal && focused && replying.length > 0 && !continued && !waitingFor;
  const waitOver = waitingFor !== null && replying.length === 0;
  // A colleague's public reply that landed while this draft was open.
  const landedReply = draftSince
    ? ticket.messages.findLast(
        (m) => m.visibility === "public" && m.authorType === "agent" && m.author.id !== CURRENT_AGENT_ID && m.timestamp > draftSince,
      )
    : undefined;
  const showLandedReply = !internal && landedReply && landedReply.id !== dismissedReplyId;

  const reset = () => {
    setBody("");
    setFiles([]);
    setError(null);
    setDraftSince(null);
  };

  const submit = (setStatus?: TicketStatus) => {
    const parsed = composerSchema.safeParse({ visibility: mode, body, attachments: files });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your message and try again.");
      textareaRef.current?.focus();
      return;
    }
    send.mutate(
      { ...parsed.data, setStatus },
      {
        onSuccess: () => {
          reset();
          onSent?.();
          const statusNote = setStatus ? ` · status set to ${STATUS_META[setStatus].label}` : "";
          toast.success(internal ? "Internal note added" : `Reply added for ${ticket.contact.name}${statusNote}`, {
            description: internal ? undefined : "Sample mode — no email was sent.",
          });
        },
      },
    );
  };

  const focusAt = (pos: number) =>
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });

  /** Puts text at `at` (default: the caret), then moves the caret after it. */
  const insertAt = (text: string, at = textareaRef.current?.selectionStart ?? body.length) => {
    if (!body.trim()) setDraftSince(new Date().toISOString());
    setBody((b) => b.slice(0, at) + text + b.slice(at));
    setError(null);
    focusAt(at + text.length);
  };

  /** Adds a block (saved reply, article, quote) to the draft, with a greeting when the reply is empty. */
  const insertBlock = (text: string) => {
    const greeting = body.trim() || internal ? "" : `Hi ${firstName},\n\n`;
    const next = body.trim() ? `${body.trimEnd()}\n\n${text}` : `${greeting}${text}`;
    if (!body.trim()) setDraftSince(new Date().toISOString());
    setBody(next);
    setError(null);
    focusAt(next.length);
  };
  useImperativeHandle(handle, () => ({ insert: insertBlock }));

  /** Wraps the selection (or inserts a placeholder) with lightweight markup. */
  const format = (kind: "bold" | "italic" | "list" | "link") => {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e);
    let insert: string;
    let cursor: [number, number];
    if (kind === "list") {
      const lines = (selected || "List item").split("\n").map((l) => (l.startsWith("- ") ? l : `- ${l}`));
      const prefix = s > 0 && value[s - 1] !== "\n" ? "\n" : "";
      insert = prefix + lines.join("\n");
      cursor = [s + insert.length, s + insert.length];
    } else if (kind === "link") {
      const text = selected || "link text";
      insert = `[${text}](https://)`;
      const urlStart = s + text.length + 3;
      cursor = [urlStart, urlStart + 8];
    } else {
      const mark = kind === "bold" ? "**" : "_";
      const text = selected || (kind === "bold" ? "bold text" : "italic text");
      insert = `${mark}${text}${mark}`;
      cursor = [s + mark.length, s + mark.length + text.length];
    }
    setBody(value.slice(0, s) + insert + value.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(...cursor);
    });
  };

  const insertSavedReply = (id: string, text: string) => {
    recordUse.mutate(id);
    insertBlock(text);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next: Draft[] = [];
    for (const f of Array.from(list)) {
      const draft = { name: f.name, size: f.size || 1, mimeType: f.type || "application/octet-stream" };
      const check = attachmentDraftSchema.safeParse(draft);
      if (check.success) next.push(draft);
      else toast.error(`${f.name} wasn't attached`, { description: check.error.issues[0]?.message });
    }
    setFiles((prev) => [...prev, ...next].slice(0, 10));
  };

  /** Palette closed without picking anything: a typed "/" or "@" (and its search) was just text after all. */
  const dismissPalette = () => {
    if (palette?.trigger) insertAt(`${palette.trigger}${paletteQuery}`, palette.caret);
    else focusAt(palette?.caret ?? body.length);
    setPalette(null);
  };
  const closePalette = () => {
    const caret = palette?.caret ?? body.length;
    setPalette(null);
    focusAt(caret);
  };

  return (
    <section
      aria-label={internal ? "Add internal note" : "Reply to customer"}
      className={cn(
        "rounded-xl border border-line-soft bg-card transition-colors focus-within:border-desk",
        internal && "border-[#FCD34D] bg-[#FFFBEB] focus-within:border-[#F59E0B]",
      )}
    >
      {/* Mode switch + tools */}
      <div className="flex items-center justify-between gap-2 border-b border-line-soft px-3">
        <div className="flex" role="tablist" aria-label="Message type">
          {(
            [
              ["public", "Reply"],
              ["internal", "Internal note"],
            ] as const
          ).map(([value, label]) => {
            const selected = mode === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onModeChange(value)}
                title={value === "public" ? `To: ${ticket.contact.name} <${ticket.contact.email}>` : "Only visible to support staff"}
                className={cn(
                  "-mb-px border-b-2 px-3 py-3 text-body transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-desk-action",
                  selected
                    ? value === "internal"
                      ? "border-[#D97706] font-semibold text-[#92400E]"
                      : "border-desk font-semibold text-ink"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-0.5">
          <ToolButton label="Attach files" icon={PaperclipIcon} onClick={() => fileInput.current?.click()} />
          <ToolButton label="Insert link" icon={LinkSimpleIcon} onClick={() => format("link")} />
          <ToolButton label="Link knowledge article" icon={BookOpenTextIcon} onClick={() => openPalette("article", null)} />
          <ToolButton label="Mention a teammate" icon={AtIcon} onClick={() => openPalette("mention", null)} />
          <input ref={fileInput} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger aria-label="More formatting" className={toolClass}>
                  <DotsThreeIcon size={18} weight="bold" aria-hidden />
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>More</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => format("bold")}>
                <TextBIcon size={15} aria-hidden /> Bold
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => format("italic")}>
                <TextItalicIcon size={15} aria-hidden /> Italic
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => format("list")}>
                <ListBulletsIcon size={15} aria-hidden /> Bulleted list
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => openPalette("root", null)}>
                <span className="w-[15px] text-center font-mono text-[13px]" aria-hidden>/</span> All actions
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" disabled={!body && !files.length} onSelect={reset}>
                <TrashIcon size={15} aria-hidden /> Discard draft
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showReplyingWarning && (
        <CollisionNotice
          text={`${joinNames(replying)} ${replying.length > 1 ? "are" : "is"} replying to ${firstName} right now. Two replies at once can confuse the customer.`}
          actions={
            <>
              <NoticeButton
                onClick={() => {
                  setWaitingFor(joinNames(replying));
                  textareaRef.current?.blur();
                }}
              >
                Wait
              </NoticeButton>
              <NoticeButton primary onClick={() => setContinued(true)}>
                Continue anyway
              </NoticeButton>
            </>
          }
        />
      )}
      {waitingFor && !waitOver && (
        <CollisionNotice tone="info" text={`Waiting for ${waitingFor} to finish — we'll let you know here.`} actions={<NoticeButton onClick={() => setWaitingFor(null)}>Stop waiting</NoticeButton>} />
      )}
      {waitOver && (
        <CollisionNotice
          tone="info"
          text={`${waitingFor} finished. Read the conversation above before you respond.`}
          actions={
            <NoticeButton
              primary
              onClick={() => {
                setWaitingFor(null);
                setContinued(true);
                textareaRef.current?.focus();
              }}
            >
              Reply now
            </NoticeButton>
          }
        />
      )}
      {showLandedReply && (
        <CollisionNotice
          text={`${landedReply.author.name.split(" ")[0]} replied to ${firstName} while you were writing. Read it before you send.`}
          actions={<NoticeButton onClick={() => setDismissedReplyId(landedReply.id)}>Dismiss</NoticeButton>}
        />
      )}

      <Popover open={!!palette} onOpenChange={(o) => !o && dismissPalette()}>
        <PopoverAnchor asChild>
          <div className="mx-3 mt-3 rounded-lg border border-line bg-card focus-within:border-desk">
            <label htmlFor="composer-body" className="sr-only">
              {internal ? "Internal note" : `Reply to ${ticket.contact.name}`}
            </label>
            <textarea
              id="composer-body"
              ref={textareaRef}
              value={body}
              onChange={(e) => {
                if (!body.trim() && e.target.value.trim()) setDraftSince(new Date().toISOString());
                setBody(e.target.value);
                if (error) setError(null);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  submit();
                } else if ((e.key === "/" || e.key === "@") && !e.ctrlKey && !e.metaKey && atWordStart(body, e.currentTarget.selectionStart)) {
                  e.preventDefault();
                  openPalette(e.key === "/" ? "root" : "mention", e.key);
                }
              }}
              rows={3}
              placeholder={internal ? "Type / for actions, @ to mention, or write an internal note…" : "Type / for actions, @ to mention, or write a reply…"}
              aria-invalid={!!error}
              aria-describedby={error ? "composer-error" : undefined}
              aria-haspopup="listbox"
              className="block max-h-[40vh] min-h-[76px] w-full resize-y rounded-lg bg-transparent px-3 py-2.5 text-body leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="end"
          side="bottom"
          sideOffset={-28}
          collisionPadding={12}
          className="w-[300px] gap-0 overflow-hidden rounded-xl p-0"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {palette && (
            <ComposerPalette
              ticket={ticket}
              view={palette.view}
              onViewChange={(view) => setPalette((p) => (p ? { ...p, view } : p))}
              query={paletteQuery}
              onQueryChange={setPaletteQuery}
              onDone={closePalette}
              handlers={{
                assign: actions.assign,
                setStatus: actions.setStatus,
                toggleTag: actions.toggleTag,
                insertSavedReply,
                insertArticle: (a) => insertBlock(articleLink(a)),
                escalate: () => actions.update({ priority: "urgent", addTag: "escalated" }, `#${ticket.ticketNumber} escalated — priority set to Urgent`),
                closeTicket: () => actions.setStatus("closed"),
                mention: (agent) => insertAt(`@${agent.name} `, palette.caret),
              }}
            />
          )}
        </PopoverContent>
      </Popover>

      <AttachmentList attachments={files} onRemove={(i) => setFiles((f) => f.filter((_, j) => j !== i))} className="px-3 pt-3" />

      {error && (
        <p id="composer-error" role="alert" className="px-4 pt-2 text-caption font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-card px-3.5 text-button text-ink transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action data-[state=open]:border-desk">
            Saved replies
            <CaretDownIcon size={13} aria-hidden className="text-ink-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <DropdownMenuLabel className="text-nav-group-label text-ink-muted uppercase">Insert a saved reply</DropdownMenuLabel>
            {!savedReplies && <DropdownMenuItem disabled>Loading saved replies…</DropdownMenuItem>}
            {savedReplies?.map((r) => (
              <DropdownMenuItem key={r.id} onSelect={() => insertSavedReply(r.id, r.body)} className="flex-col items-start gap-0.5">
                <span className="flex w-full items-center gap-2">
                  <span className="flex-1 font-medium">{r.name}</span>
                  <code className="text-[11px] text-ink-muted">{r.shortcut}</code>
                </span>
                <span className="line-clamp-1 text-caption text-ink-muted">{r.body}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-3">
          <span className="hidden text-caption text-ink-muted xl:inline">Ctrl + Enter to {internal ? "add note" : "send"}</span>
          {internal ? (
            <button type="button" onClick={() => submit()} disabled={send.isPending} className={cn(sendClass, "rounded-lg bg-[#B45309] hover:bg-[#92400E]")}>
              {send.isPending ? "Adding…" : "Add note"}
            </button>
          ) : (
            <div className="flex">
              <button type="button" onClick={() => submit()} disabled={send.isPending} className={cn(sendClass, "rounded-l-lg")}>
                {send.isPending ? "Sending…" : "Send"}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger disabled={send.isPending} aria-label="More send options" className={cn(sendClass, "rounded-r-lg border-l border-l-white/30 px-2.5")}>
                  <CaretDownIcon size={13} weight="bold" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {SEND_AND_SET.filter((s) => s !== ticket.status).map((s) => (
                    <DropdownMenuItem key={s} onSelect={() => submit(s)}>
                      Send and set as {STATUS_META[s].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const sendClass =
  "inline-flex h-10 items-center justify-center bg-desk px-5 text-button font-semibold text-white transition-colors hover:bg-desk-press focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action disabled:opacity-60";

const toolClass =
  "inline-flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-desk-tint hover:text-desk focus-visible:outline-2 focus-visible:outline-desk-action data-[state=open]:bg-desk-tint";

/** Inline collision message inside the composer — awareness, not a lock. */
function CollisionNotice({ text, actions, tone = "warn" }: { text: string; actions: ReactNode; tone?: "warn" | "info" }) {
  return (
    <div
      role="status"
      className={cn(
        "mx-3 mt-3 flex flex-col gap-2 rounded-xl px-3.5 py-2.5 text-[13px] sm:flex-row sm:items-center",
        tone === "warn" ? "bg-[#FFF7ED] text-[#9A3412]" : "bg-desk-10 text-ink",
      )}
    >
      <span className="flex min-w-0 flex-1 items-start gap-2">
        <WarningIcon size={16} weight="fill" aria-hidden className={cn("mt-px shrink-0", tone === "warn" ? "text-[#EA580C]" : "text-desk")} />
        {text}
      </span>
      <span className="flex shrink-0 gap-1.5">{actions}</span>
    </div>
  );
}

function NoticeButton({ children, onClick, primary }: { children: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg px-3 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-desk-action",
        primary ? "bg-desk text-white hover:bg-desk-press" : "border border-line bg-card text-ink hover:border-desk",
      )}
    >
      {children}
    </button>
  );
}

function ToolButton({ label, icon: IconCmp, onClick }: { label: string; icon: Icon; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" onClick={onClick} aria-label={label} className={toolClass}>
          <IconCmp size={17} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
