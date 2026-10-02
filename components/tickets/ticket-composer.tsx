"use client";

import { useRef, useState, type RefObject } from "react";
import {
  ArrowBendUpLeftIcon,
  CaretDownIcon,
  LightningIcon,
  LinkSimpleIcon,
  ListBulletsIcon,
  LockSimpleIcon,
  PaperclipIcon,
  PaperPlaneTiltIcon,
  TextBIcon,
  TextItalicIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DetailPrimaryButton } from "@/components/shared/desk-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAddMessage } from "@/hooks/use-ticket";
import { SAVED_REPLIES } from "@/lib/mock-data/tickets";
import { attachmentDraftSchema, composerSchema } from "@/lib/schemas/ticket";
import { STATUS_META } from "@/lib/ticket-meta";
import type { Ticket, TicketStatus } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { AttachmentList } from "./attachment-list";

export type ComposerMode = "public" | "internal";
type Draft = { name: string; size: number; mimeType: string };

const SEND_AND_SET: TicketStatus[] = ["pending", "resolved", "closed"];

/**
 * Reply / internal note composer. Sending appends to the mock thread only —
 * no email is delivered. Ctrl/⌘ + Enter sends.
 */
export function TicketComposer({
  ticket,
  mode,
  onModeChange,
  textareaRef,
}: {
  ticket: Ticket;
  mode: ComposerMode;
  onModeChange: (m: ComposerMode) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<Draft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const send = useAddMessage(ticket.id);
  const internal = mode === "internal";
  const firstName = ticket.contact.name.split(" ")[0];

  const reset = () => {
    setBody("");
    setFiles([]);
    setError(null);
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
          const statusNote = setStatus ? ` · status set to ${STATUS_META[setStatus].label}` : "";
          toast.success(internal ? "Internal note added" : `Reply added for ${ticket.contact.name}${statusNote}`, {
            description: internal ? undefined : "Sample mode — no email was sent.",
          });
        },
      },
    );
  };

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

  const insertSavedReply = (text: string) => {
    const greeting = body.trim() ? "" : `Hi ${firstName},\n\n`;
    setBody((b) => (b.trim() ? `${b.trimEnd()}\n\n${text}` : `${greeting}${text}`));
    setError(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
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

  return (
    <section
      aria-label={internal ? "Add internal note" : "Reply to customer"}
      className={cn(
        "overflow-hidden rounded-2xl border border-line-soft bg-card shadow-card transition-colors focus-within:border-desk",
        internal && "border-[#FCD34D] bg-[#FFFBEB] focus-within:border-[#F59E0B]",
      )}
    >
      {/* Mode switch */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 sm:px-4" role="tablist" aria-label="Message type">
        <div className="flex">
          {(
            [
              ["public", "Reply", ArrowBendUpLeftIcon],
              ["internal", "Internal note", LockSimpleIcon],
            ] as const
          ).map(([value, label, Icon]) => {
            const selected = mode === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onModeChange(value)}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-3.5 text-body transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-desk-action",
                  selected
                    ? value === "internal"
                      ? "border-[#D97706] font-semibold text-[#92400E]"
                      : "border-desk font-semibold text-desk"
                    : "border-transparent text-ink hover:text-desk",
                )}
              >
                <Icon size={15} weight={selected ? "bold" : "regular"} aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
        <p className="truncate pb-1 text-caption text-ink-muted sm:pb-0">
          {internal ? (
            <span className="font-semibold text-[#92400E]">Only visible to support staff</span>
          ) : (
            <>
              To: <span className="text-ink">{ticket.contact.name}</span>{" "}
              <span className="hidden sm:inline">&lt;{ticket.contact.email}&gt;</span>
            </>
          )}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 pt-2 sm:px-4">
        <ToolButton label="Bold" icon={TextBIcon} onClick={() => format("bold")} />
        <ToolButton label="Italic" icon={TextItalicIcon} onClick={() => format("italic")} />
        <ToolButton label="Bulleted list" icon={ListBulletsIcon} onClick={() => format("list")} />
        <ToolButton label="Link" icon={LinkSimpleIcon} onClick={() => format("link")} />
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <ToolButton label="Attach files" icon={PaperclipIcon} onClick={() => fileInput.current?.click()} />
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        {!internal && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="gap-1 rounded-lg text-ink-muted hover:bg-desk-tint hover:text-desk">
                <LightningIcon size={15} aria-hidden />
                Saved replies
                <CaretDownIcon size={11} aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel className="text-nav-group-label text-ink-muted uppercase">Insert a saved reply</DropdownMenuLabel>
              {SAVED_REPLIES.map((r) => (
                <DropdownMenuItem key={r.id} onSelect={() => insertSavedReply(r.body)} className="flex-col items-start gap-0.5">
                  <span className="font-medium">{r.title}</span>
                  <span className="line-clamp-1 text-caption text-ink-muted">{r.body}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <label htmlFor="composer-body" className="sr-only">
        {internal ? "Internal note" : `Reply to ${ticket.contact.name}`}
      </label>
      <textarea
        id="composer-body"
        ref={textareaRef}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          if (error) setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={5}
        placeholder={internal ? "Share context with your team — customers never see notes." : `Write your reply to ${firstName}…`}
        aria-invalid={!!error}
        aria-describedby={error ? "composer-error" : undefined}
        className="block max-h-[50vh] min-h-[120px] w-full resize-y bg-transparent px-4 py-3 text-body leading-relaxed text-ink placeholder:text-ink-faint sm:px-5reground focus:outline-none"
      />

      <AttachmentList attachments={files} onRemove={(i) => setFiles((f) => f.filter((_, j) => j !== i))} className="px-4 pb-3 sm:px-5" />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
        <p className="min-h-5 text-caption" aria-live="polite">
          {error ? (
            <span id="composer-error" className="font-medium text-destructive">
              {error}
            </span>
          ) : (
            <span className="hidden text-ink-muted sm:inline">Ctrl + Enter to {internal ? "add note" : "send"}</span>
          )}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={reset}
            disabled={(!body && !files.length) || send.isPending}
            className="h-10 rounded-[9px] px-4 text-button font-semibold text-ink-muted transition-colors hover:bg-desk-tint hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          {internal ? (
            <DetailPrimaryButton icon={LockSimpleIcon} onClick={() => submit()} disabled={send.isPending} className="bg-[#B45309] hover:bg-[#92400E]">
              {send.isPending ? "Adding…" : "Add note"}
            </DetailPrimaryButton>
          ) : (
            <div className="flex">
              <DetailPrimaryButton icon={PaperPlaneTiltIcon} onClick={() => submit()} disabled={send.isPending} className="rounded-r-none">
                {send.isPending ? "Sending…" : "Send"}
              </DetailPrimaryButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <DetailPrimaryButton disabled={send.isPending} aria-label="More send options" className="rounded-l-none border-l border-l-white/30 px-2.5">
                    <CaretDownIcon size={13} weight="bold" aria-hidden />
                  </DetailPrimaryButton>
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

function ToolButton({ label, icon: Icon, onClick }: { label: string; icon: typeof TextBIcon; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" onClick={onClick} aria-label={label} className="rounded-lg text-ink-muted hover:bg-desk-tint hover:text-desk">
          <Icon size={16} aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
