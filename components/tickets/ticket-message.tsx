"use client";

import { ArrowBendUpLeftIcon, ChecksIcon, CopyIcon, DotsThreeIcon, GitMergeIcon, LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { TimeLabel } from "@/components/shared/time-label";
import { formatFullDate } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/ticket-meta";
import type { TicketMessage as Message } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { AttachmentList } from "./attachment-list";
import { MessageBody } from "./message-body";

/** The team inbox customers write to. */
export const SUPPORT_ADDRESS = "support@desk.example";

const clockFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** "10:24 AM" today, "Oct 7, 10:24 AM" before that. */
function messageTime(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today ? clockFmt.format(d) : `${dayFmt.format(d)}, ${clockFmt.format(d)}`;
}

/**
 * One entry in the thread, as a chat: the customer on the left, agent replies
 * on the right, internal notes as a full-width amber card labelled "Internal
 * note" — each distinguishable without relying on colour.
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
      <li className="flex items-center gap-2 py-1 text-caption text-ink-muted">
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
  const time = (
    <time dateTime={message.timestamp} title={formatFullDate(message.timestamp)} className="text-[13px] text-ink-muted">
      {messageTime(message.timestamp)}
    </time>
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.body);
      toast.success("Message copied");
    } catch {
      toast.error("Couldn't copy the message");
    }
  };

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${kind.toLowerCase()} from ${message.author.name}`}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-[color,background-color,opacity] hover:bg-desk-depth-10 hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-desk-action data-[state=open]:bg-desk-depth-10 data-[state=open]:opacity-100",
          !internal && "opacity-0 group-hover/msg:opacity-100",
        )}
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
  );

  if (internal) {
    return (
      <li tabIndex={-1} aria-label={`${kind} from ${message.author.name}`} className="group/msg flex gap-3 rounded-xl bg-[#FFF8EB] px-4 py-3.5 outline-none">
        <PersonAvatar name={message.author.name} src={message.author.avatar} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[14px] font-semibold text-ink">{message.author.name}</span>
              {time}
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[12px] font-medium text-[#B45309]">
                <LockSimpleIcon size={13} aria-hidden /> Internal note
              </span>
            </p>
            {menu}
          </div>
          <div className="mt-1 text-[14px] text-ink-body">
            <MessageBody body={message.body} />
          </div>
          <AttachmentList attachments={message.attachments} className="mt-3" />
        </div>
      </li>
    );
  }

  return (
    <li
      tabIndex={-1}
      aria-label={`${kind} from ${message.author.name}`}
      className={cn("group/msg flex gap-3 outline-none", agent && "flex-row-reverse")}
    >
      <PersonAvatar name={message.author.name} src={message.author.avatar} size="lg" />
      <div className={cn("flex min-w-0 max-w-[85%] flex-col @2xl:max-w-[75%]", agent && "items-end")}>
        <p className={cn("flex flex-wrap items-baseline gap-x-3", agent && "flex-row-reverse")}>
          <span className="text-[14px] font-semibold text-ink">{message.author.name}</span>
          {time}
          {!agent && isFirst && <span className="text-caption text-ink-muted">Original request</span>}
        </p>
        <p className="sr-only">
          To: {agent ? contactEmail : SUPPORT_ADDRESS} via {SOURCE_LABEL[message.channel]}
        </p>
        <div className={cn("mt-1.5 flex items-start gap-1", agent && "flex-row-reverse")}>
          <div
            className={cn(
              "relative min-w-0 rounded-xl px-3.5 py-2.5 text-[14px] text-ink",
              agent ? "rounded-tr-sm bg-[#E9F6F1] pr-8 pb-5" : "rounded-tl-sm bg-[#F2F4F7]",
            )}
          >
            <MessageBody body={message.body} />
            {agent && <ChecksIcon size={14} aria-label="Sent" className="absolute right-2.5 bottom-1.5 text-ink-muted" />}
          </div>
          {menu}
        </div>
        <AttachmentList attachments={message.attachments} className={cn("mt-2", agent && "justify-end")} />
      </div>
    </li>
  );
}
