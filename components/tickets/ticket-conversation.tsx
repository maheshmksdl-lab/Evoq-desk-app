"use client";

import type { RefObject } from "react";
import { ChatsCircleIcon, LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { DetailCard, EditButton } from "@/components/shared/desk-ui";
import type { Ticket } from "@/lib/types/ticket";
import { TicketComposer, type ComposerMode } from "./ticket-composer";
import { TicketMessage } from "./ticket-message";
import { TypingIndicator } from "./ticket-presence";

/** Chronological thread card + the reply composer under it. */
export function TicketConversation({
  ticket,
  composerMode,
  onComposerModeChange,
  textareaRef,
  composerAnchorRef,
  onAddNote,
}: {
  ticket: Ticket;
  composerMode: ComposerMode;
  onComposerModeChange: (m: ComposerMode) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  composerAnchorRef: RefObject<HTMLDivElement | null>;
  onAddNote: () => void;
}) {
  const notes = ticket.messages.filter((m) => m.visibility === "internal" && m.authorType !== "system").length;
  const replies = ticket.messages.length - notes;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <DetailCard
        icon={ChatsCircleIcon}
        title="Conversation"
        action={<EditButton icon={LockSimpleIcon} label="Add note" onClick={onAddNote} />}
      >
        <p className="-mt-2 mb-4 text-caption text-ink-muted sm:pl-9">
          {replies} {replies === 1 ? "message" : "messages"} · {notes} internal {notes === 1 ? "note" : "notes"}
        </p>
        <ol className="flex flex-col gap-3" aria-label="Conversation">
          {ticket.messages.map((m, i) => (
            <TicketMessage key={m.id} message={m} isFirst={i === 0} />
          ))}
        </ol>
      </DetailCard>
      <div ref={composerAnchorRef} className="flex scroll-mt-24 flex-col gap-2">
        <TypingIndicator ticketId={ticket.id} />
        <TicketComposer ticket={ticket} mode={composerMode} onModeChange={onComposerModeChange} textareaRef={textareaRef} />
      </div>
    </div>
  );
}
