"use client";

import { ArrowBendUpLeftIcon, CopyIcon, DotsThreeIcon, GitMergeIcon, LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { TimeLabel } from "@/components/shared/time-label";
import { SOURCE_LABEL } from "@/lib/ticket-meta";
import type { TicketMessage as Message } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { AttachmentList } from "./attachment-list";
import { MessageBody } from "./message-body";

/** The team inbox customers write to. */
export const SUPPORT_ADDRESS = "support@desk.example";

/**
 * One entry in the thread. Customer messages, public agent replies and
 * internal notes each get a distinct, non-colour-only treatment: replies are
 * labelled "Reply", notes sit on an amber band labelled "Internal note".
 */
export function TicketMessage({
  message,
  isFirst,
  contactEmail,
  onQuote,
}: {
  message: Message;
  isFirst?: boolean;
  /** Where public agent replies go. */
  contactEmail: string;
  /** Quote this message into the composer. */
  onQuote?: (text: string) => void;
}) {
  if (message.authorType === "system") {
    return (
      <li className="flex items-center gap-2 px-5 py-3 text-caption text-ink-muted">
        <span className="h-px flex-1 bg-line" aria-hidden />
        <GitMergeIcon size={14} aria-hidden />
        <span className="max-w-[70%] text-center">{message.body}</span>
        <span>
          · <TimeLabel iso={message.timestamp} />
        </span>
        <span className="h-px flex-1 bg-line" aria-hidden />
      </li>
    );
  }

  const internal = message.visibility === "internal";
  const agent = message.authorType === "agent";
  const kind = internal ? "Internal note" : agent ? "Reply" : "Message";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.body);
      toast.success("Message copied");
    } catch {
      toast.error("Couldn't copy the message");
    }
  };

  return (
    <li
      className={cn("group/msg flex gap-3 border-b border-line-soft px-5 py-4", internal && "bg-[#FFFBEB]")}
      aria-label={`${kind} from ${message.author.name}`}
    >
      <PersonAvatar name={message.author.name} src={message.author.avatar} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
            <span className="text-label font-semibold text-ink">{message.author.name}</span>
            <TimeLabel iso={message.timestamp} className="text-caption text-ink-muted" />
            {internal ? (
              <span className="inline-flex items-center gap-1 text-caption font-medium text-[#B45309]">
                <LockSimpleIcon size={11} weight="bold" aria-hidden /> Internal note
              </span>
            ) : agent ? (
              <span className="text-caption font-medium text-desk">Reply</span>
            ) : (
              isFirst && <span className="text-caption text-ink-muted">Original request</span>
            )}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Actions for ${kind.toLowerCase()} from ${message.author.name}`}
              className="-mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-desk-depth-10 hover:text-ink focus-visible:outline-2 focus-visible:outline-desk-action data-[state=open]:bg-desk-depth-10"
            >
              <DotsThreeIcon size={18} weight="bold" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onQuote && (
                <DropdownMenuItem onSelect={() => onQuote(message.body.split("\n").map((l) => `> ${l}`).join("\n"))}>
                  <ArrowBendUpLeftIcon size={15} aria-hidden /> Quote in reply
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={copy}>
                <CopyIcon size={15} aria-hidden /> Copy text
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!internal && (
          <p className="text-caption text-ink-muted">
            To: {agent ? contactEmail : SUPPORT_ADDRESS}
            <span className="sr-only"> via {SOURCE_LABEL[message.channel]}</span>
          </p>
        )}
        <div className="mt-1.5">
          <MessageBody body={message.body} />
        </div>
        <AttachmentList attachments={message.attachments} className="mt-3" />
      </div>
    </li>
  );
}
