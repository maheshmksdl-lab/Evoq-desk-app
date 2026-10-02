import { GitMergeIcon, LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { TimeLabel } from "@/components/shared/time-label";
import { SOURCE_LABEL } from "@/lib/ticket-meta";
import type { TicketMessage as Message } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { AttachmentList } from "./attachment-list";
import { MessageBody } from "./message-body";
import { SOURCE_ICON } from "./ticket-source-badge";

/**
 * One entry in the thread. Customer messages, public agent replies and
 * internal notes each get a distinct, non-colour-only treatment:
 * agent replies carry a teal rule, notes a lock label on an amber surface.
 */
export function TicketMessage({ message, isFirst }: { message: Message; isFirst?: boolean }) {
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
  const ChannelIcon = SOURCE_ICON[message.channel];

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border",
        internal ? "border-[#FCD34D]/70 bg-[#FFFBEB]" : "border-line-soft bg-white",
        !internal && agent && "border-l-[3px] border-l-desk",
      )}
      aria-label={`${internal ? "Internal note" : agent ? "Reply" : "Message"} from ${message.author.name}`}
    >
      {internal && (
        <div className="flex items-center gap-1.5 border-b border-[#FCD34D]/60 bg-[#FEF3C7]/70 px-4 py-1.5 text-caption font-semibold text-[#92400E]">
          <LockSimpleIcon size={12} weight="bold" aria-hidden />
          Internal note
          <span className="font-normal text-[#92400E]/80">· Only visible to support staff</span>
        </div>
      )}
      <div className="flex items-start gap-3 px-4 pt-3.5">
        <PersonAvatar name={message.author.name} src={message.author.avatar} size="lg" />
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-0.5">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 text-label font-bold text-ink">
              {message.author.name}
              {isFirst && <span className="text-caption font-normal text-ink-muted">Original request</span>}
            </p>
            <p className="text-caption text-ink-muted">{message.author.role}</p>
          </div>
          <p className="flex items-center gap-1.5 text-caption text-ink-muted">
            {!internal && (
              <span className="inline-flex items-center gap-1" title={`Via ${SOURCE_LABEL[message.channel]}`}>
                <ChannelIcon size={13} aria-hidden />
                <span className="hidden sm:inline">{SOURCE_LABEL[message.channel]}</span>
                <span className="sr-only sm:hidden">via {SOURCE_LABEL[message.channel]}</span>
                <span aria-hidden>·</span>
              </span>
            )}
            <TimeLabel iso={message.timestamp} mode="timestamp" />
          </p>
        </div>
      </div>
      <div className="px-4 pt-2.5 pb-4 sm:pl-[68px]">
        <MessageBody body={message.body} />
        <AttachmentList attachments={message.attachments} className="mt-3" />
      </div>
    </li>
  );
}
