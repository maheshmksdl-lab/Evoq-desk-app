"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowSquareOutIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleIcon,
  CopyIcon,
  DotsThreeIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  FileTextIcon,
  GitMergeIcon,
  LinkSimpleIcon,
  PaperclipIcon,
  PhoneIcon,
  ProhibitIcon,
  TagIcon,
  TicketIcon,
  XCircleIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useRegisterAction } from "@/components/layout/actions-context";
import { DetailCard, IconTile } from "@/components/shared/desk-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { useTicket, useUpdateTicket } from "@/hooks/use-ticket";
import { CURRENT_AGENT_ID } from "@/lib/mock-data/agents";
import { KNOWLEDGE_ARTICLES, suggestArticles, type KnowledgeArticle } from "@/lib/mock-data/knowledge";
import { PRIORITY_META, SOURCE_LABEL, STATUS_META } from "@/lib/ticket-meta";
import { ticketHref } from "@/lib/ticket-routes";
import type { Ticket } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { AttachmentList } from "./attachment-list";
import { RelatedTickets } from "./related-tickets";
import { AssigneeMenuItems, PriorityMenuItems, StatusMenuItems, TagMenuItems, useTicketActions } from "./ticket-actions";
import { TicketActivity } from "./ticket-activity";
import { articleLink, TicketComposer, type ComposerHandle, type ComposerMode } from "./ticket-composer";
import { TicketCustomerPanel } from "./ticket-customer-panel";
import { TicketMergeDialog } from "./ticket-merge-dialog";
import { TicketMessage } from "./ticket-message";
import { propertyControl, TicketProperties } from "./ticket-meta";
import { TicketCollaboration, TypingIndicator } from "./ticket-presence";
import { TicketSlaCard } from "./ticket-sla-card";
import { TicketSpamNotice } from "./ticket-spam-notice";
import { TicketTags } from "./ticket-tags";

type Tab = "conversation" | "details" | "customer" | "related" | "activity";
type HeaderMenu = "status" | "assignee" | "priority";

/** Where the ticket sits in the list beside it — drives previous / next. */
export interface QueuePosition {
  index: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
}

const iconBtn =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-desk-depth-10 hover:text-ink focus-visible:outline-2 focus-visible:outline-desk-action disabled:pointer-events-none disabled:opacity-40 data-[state=open]:bg-desk-depth-10";
/** Bordered header control (status, assignee, more). */
const headerControl = cn(propertyControl, "h-9 px-3 text-body");

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error(`Couldn't copy ${what.toLowerCase()}`);
  }
}

/**
 * The ticket workspace, docked to the right of the ticket list: everything
 * needed to handle a ticket — conversation and composer, properties, customer,
 * related tickets, history and suggested knowledge — without leaving the list.
 * On phones it covers the screen, with a back control to the list.
 */
export function TicketWorkspace({ ticketId, onClose, position }: { ticketId: string; onClose: () => void; position?: QueuePosition }) {
  const { data: ticket, isPending, isError, refetch } = useTicket(ticketId);

  return (
    <aside
      aria-label={ticket ? `Ticket #${ticket.ticketNumber}` : "Ticket"}
      className={cn(
        "@container flex min-w-0 flex-col overflow-hidden bg-card",
        // Phones: the whole screen. Tablet / desktop: full height under the header, beside the list.
        "fixed inset-0 z-50 md:sticky md:inset-auto md:top-16 md:z-auto md:h-[calc(100dvh-64px)] md:border-l md:border-line lg:top-(--header-h) lg:h-[calc(100dvh-var(--header-h))]",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-6 motion-safe:duration-200",
      )}
    >
      {ticket ? (
        <WorkspaceBody key={ticket.id} ticket={ticket} onClose={onClose} position={position} />
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-between border-b border-line-soft px-3 py-2.5">
            <BackButton onClose={onClose} />
            <button type="button" onClick={onClose} aria-label="Close ticket" className={cn(iconBtn, "ml-auto max-md:hidden")}>
              <XIcon size={18} aria-hidden />
            </button>
          </div>
          {isPending ? (
            <WorkspaceSkeleton />
          ) : isError ? (
            <ErrorState
              title="Unable to load ticket"
              hint="Your ticket list is still here. Try loading the ticket again."
              action={
                <button type="button" onClick={() => refetch()} className={propertyControl}>
                  Try again
                </button>
              }
            />
          ) : (
            <EmptyState icon={TicketIcon} title="Ticket not found" hint={`We couldn't find a ticket with ID “${ticketId}”. It may have been deleted, or the link may be incorrect.`} />
          )}
        </>
      )}
    </aside>
  );
}

/** Phones: back to the list. */
function BackButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="-ml-1 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-button-sm text-ink-body hover:bg-desk-depth-10 focus-visible:outline-2 focus-visible:outline-desk-action md:hidden"
    >
      <ArrowLeftIcon size={16} aria-hidden /> Tickets
    </button>
  );
}

function WorkspaceBody({ ticket, onClose, position }: { ticket: Ticket; onClose: () => void; position?: QueuePosition }) {
  const [tab, setTab] = useState<Tab>("conversation");
  const [mode, setMode] = useState<ComposerMode>("public");
  const [menu, setMenu] = useState<HeaderMenu | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composer = useRef<ComposerHandle>(null);

  const focusComposer = (m: ComposerMode) => {
    setTab("conversation");
    setMode(m);
    // Wait a frame so the conversation tab is on screen before focusing.
    requestAnimationFrame(() => textareaRef.current?.focus());
  };
  const insert = (text: string) => {
    setTab("conversation");
    requestAnimationFrame(() => composer.current?.insert(text));
  };

  // Shortcuts (R, N, A, S) and the command menu act on the open ticket.
  useRegisterAction("reply", () => focusComposer("public"));
  useRegisterAction("internal-note", () => focusComposer("internal"));
  useRegisterAction("assign", () => setMenu("assignee"));
  useRegisterAction("change-status", () => setMenu("status"));
  useRegisterAction("change-priority", () => setMenu("priority"));
  useRegisterAction("add-tag", () => {
    setTab("details");
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-add-tag]")?.click());
  });

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "conversation", label: "Conversation", count: ticket.messages.length },
    { key: "details", label: "Details" },
    { key: "customer", label: "Customer" },
    { key: "related", label: "Related", count: ticket.relatedTickets.length },
    { key: "activity", label: "Activity" },
  ];

  return (
    <>
      <WorkspaceHeader ticket={ticket} onClose={onClose} position={position} menu={menu} onMenu={setMenu} onProfile={() => setTab("customer")} />

      <div role="tablist" aria-label="Ticket sections" className="scrollbar-none mt-3 flex shrink-0 gap-6 overflow-x-auto border-b border-line px-5 @xl:justify-between">
        {tabs.map((t) => (
          <button
            key={t.key}
            id={`ws-tab-${t.key}`}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            aria-controls="ws-panel"
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-1 py-3 text-body whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-desk-action",
              tab === t.key ? "border-desk font-semibold text-ink" : "border-transparent text-ink-body hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={cn("min-w-5 rounded-md px-1.5 text-center text-caption", tab === t.key ? "bg-desk-10 text-desk" : "bg-muted text-ink-muted")}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div id="ws-panel" role="tabpanel" aria-labelledby={`ws-tab-${tab}`} className="flex min-h-0 flex-1 flex-col">
        {/* The conversation stays mounted so an unsent draft survives a look at the other tabs. */}
        <div className={cn("min-h-0 flex-1 flex-col", tab === "conversation" ? "flex" : "hidden")}>
          <Conversation ticket={ticket} mode={mode} onModeChange={setMode} textareaRef={textareaRef} composer={composer} onInsert={insert} />
        </div>

        {tab === "details" && (
          <Scroll>
            <div className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-2">
              <div className="grid min-w-0 gap-4">
                <TicketProperties ticket={ticket} />
                <DetailCard icon={TagIcon} title="Tags">
                  <TicketTags ticketId={ticket.id} tags={ticket.tags} />
                </DetailCard>
              </div>
              <div className="grid min-w-0 gap-4">
                <TicketSlaCard sla={ticket.sla} status={ticket.status} />
                <DetailCard icon={PaperclipIcon} title="Attachments">
                  {ticket.attachments.length ? (
                    <AttachmentList attachments={ticket.attachments} />
                  ) : (
                    <p className="text-body text-ink-muted">Files shared in the conversation appear here.</p>
                  )}
                </DetailCard>
              </div>
            </div>
          </Scroll>
        )}
        {tab === "customer" && (
          <Scroll>
            <TicketCustomerPanel context={ticket.customerContext} />
          </Scroll>
        )}
        {tab === "related" && (
          <Scroll>
            <DetailCard icon={LinkSimpleIcon} title="Related tickets">
              <RelatedTickets tickets={ticket.relatedTickets} empty="No related tickets linked." />
            </DetailCard>
          </Scroll>
        )}
        {tab === "activity" && (
          <Scroll>
            <TicketActivity activities={ticket.activities} />
          </Scroll>
        )}
      </div>
    </>
  );
}

function Scroll({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin sm:p-5">{children}</div>;
}

// ── Header ───────────────────────────────────────────────────────────

function WorkspaceHeader({
  ticket,
  onClose,
  position,
  menu,
  onMenu,
  onProfile,
}: {
  ticket: Ticket;
  onClose: () => void;
  position?: QueuePosition;
  menu: HeaderMenu | null;
  onMenu: (m: HeaderMenu | null) => void;
  onProfile: () => void;
}) {
  const actions = useTicketActions(ticket);
  const update = useUpdateTicket();
  const [mergeOpen, setMergeOpen] = useState(false);
  const status = STATUS_META[ticket.status];
  const priority = PRIORITY_META[ticket.priority];
  const following = ticket.followers.some((f) => f.id === CURRENT_AGENT_ID);
  const done = ticket.status === "resolved" || ticket.status === "closed";
  const menuProps = (key: HeaderMenu) => ({ open: menu === key, onOpenChange: (o: boolean) => onMenu(o ? key : null) });
  const { contact, customer } = ticket.customerContext;

  const resolve = () =>
    update.mutate(
      { id: ticket.id, patch: { status: "resolved" } },
      {
        onSuccess: () =>
          toast.success(`#${ticket.ticketNumber} resolved`, {
            action: position?.onNext ? { label: "Next ticket", onClick: position.onNext } : undefined,
          }),
      },
    );

  return (
    <header className="shrink-0 px-5 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <BackButton onClose={onClose} />
        <span className="text-h2 whitespace-nowrap text-ink-muted">#{ticket.ticketNumber}</span>
        <DropdownMenu {...menuProps("priority")}>
          <DropdownMenuTrigger
            aria-label={`Priority: ${priority.label}. Change priority`}
            className="inline-flex h-7 items-center rounded-md px-2.5 text-label transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
            style={{ color: priority.color, backgroundColor: priority.bg }}
          >
            {priority.label}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <PriorityMenuItems value={ticket.priority} onChange={actions.setPriority} />
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-1.5">
          <DropdownMenu {...menuProps("status")}>
            <DropdownMenuTrigger className={headerControl} aria-label={`Status: ${status.label}. Change status`}>
              {status.label}
              <CaretDownIcon size={13} aria-hidden className="text-ink-muted" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <StatusMenuItems value={ticket.status} onChange={actions.setStatus} />
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu {...menuProps("assignee")}>
            <DropdownMenuTrigger className={cn(headerControl, "max-w-[180px] pl-1.5")} aria-label={`Assignee: ${ticket.assignee?.name ?? "Unassigned"}. Change assignee`}>
              <PersonAvatar name={ticket.assignee?.name ?? null} src={ticket.assignee?.avatar} size="sm" />
              <span className={cn("truncate", !ticket.assignee && "text-ink-muted")}>{ticket.assignee?.name ?? "Assign"}</span>
              <CaretDownIcon size={13} aria-hidden className="shrink-0 text-ink-muted" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[70vh] w-64 overflow-y-auto">
              <AssigneeMenuItems ticket={ticket} onAssign={actions.assign} />
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(headerControl, "w-9 justify-center px-0")} aria-label="More actions">
              <DotsThreeIcon size={18} weight="bold" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled={!position?.onPrev} onSelect={() => position?.onPrev?.()}>
                <CaretUpIcon size={15} aria-hidden /> Previous ticket <DropdownMenuShortcut>K</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!position?.onNext} onSelect={() => position?.onNext?.()}>
                <CaretDownIcon size={15} aria-hidden /> Next ticket <DropdownMenuShortcut>J</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!done && (
                <DropdownMenuItem onSelect={resolve}>
                  <CheckCircleIcon size={15} aria-hidden /> Resolve
                </DropdownMenuItem>
              )}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <TagIcon size={15} aria-hidden /> Tags
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-[60vh] w-52 overflow-y-auto">
                  <TagMenuItems tags={ticket.tags} onToggle={actions.toggleTag} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onSelect={() => setMergeOpen(true)} disabled={ticket.status === "closed"}>
                <GitMergeIcon size={15} aria-hidden /> Merge…
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  update.mutate(
                    { id: ticket.id, patch: { following: !following } },
                    { onSuccess: () => toast.success(following ? "You've stopped following this ticket" : "You'll be notified about updates to this ticket") },
                  )
                }
              >
                {following ? <EyeSlashIcon size={15} aria-hidden /> : <EyeIcon size={15} aria-hidden />}
                {following ? "Unfollow" : "Follow"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => copy(ticket.ticketNumber, "Ticket ID")}>
                <CopyIcon size={15} aria-hidden /> Copy ticket ID
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => copy(`${window.location.origin}${ticketHref(ticket.id)}`, "Link")}>
                <LinkSimpleIcon size={15} aria-hidden /> Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open(ticketHref(ticket.id), "_blank", "noopener")}>
                <ArrowSquareOutIcon size={15} aria-hidden /> Open in new tab
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!ticket.spam && (
                <DropdownMenuItem onSelect={() => actions.update({ spam: true }, `#${ticket.ticketNumber} marked as spam`)}>
                  <ProhibitIcon size={15} aria-hidden /> Mark as spam
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" disabled={ticket.status === "closed"} onSelect={() => actions.setStatus("closed")}>
                <XCircleIcon size={15} aria-hidden /> Close ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" onClick={onClose} aria-label="Close ticket" title="Close (Esc)" className={cn(iconBtn, "max-md:hidden")}>
            <XIcon size={20} aria-hidden />
          </button>
        </div>
      </div>

      <h2 className="mt-2 text-h1 text-ink">{ticket.subject}</h2>
      <p className="mt-1 text-body text-ink-muted">
        Created <TimeLabel iso={ticket.createdAt} /> via {SOURCE_LABEL[ticket.source]}
        <span className="mx-2" aria-hidden>
          •
        </span>
        Updated <TimeLabel iso={ticket.updatedAt} />
      </p>
      <TicketCollaboration ticket={ticket} className="mt-2" />

      {/* Requester */}
      <div className="mt-4 flex items-start gap-4 rounded-xl border border-line-soft p-4">
        <PersonAvatar name={contact.name} src={contact.avatar} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label font-semibold text-ink">{contact.name}</p>
          <p className="truncate text-body text-ink-muted">{customer.name}</p>
          <p className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-body text-ink-body">
            <a href={`mailto:${contact.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-desk">
              <EnvelopeSimpleIcon size={16} aria-hidden className="shrink-0 text-ink-muted" />
              <span className="truncate">{contact.email}</span>
            </a>
            {contact.phone && (
              <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 whitespace-nowrap hover:text-desk">
                <PhoneIcon size={16} aria-hidden className="shrink-0 text-ink-muted" />
                {contact.phone}
              </a>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={onProfile} className={cn(headerControl, "@max-md:hidden")}>
            View profile <ArrowRightIcon size={14} aria-hidden />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={`More about ${contact.name}`} className={iconBtn}>
              <DotsThreeIcon size={18} weight="bold" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onProfile}>
                <ArrowRightIcon size={15} aria-hidden /> View profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => copy(contact.email, "Email")}>
                <EnvelopeSimpleIcon size={15} aria-hidden /> Copy email
              </DropdownMenuItem>
              {contact.phone && (
                <DropdownMenuItem onSelect={() => copy(contact.phone, "Phone number")}>
                  <PhoneIcon size={15} aria-hidden /> Copy phone number
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {ticket.spam && (
        <div className="mt-3">
          <TicketSpamNotice ticket={ticket} />
        </div>
      )}
      {mergeOpen && <TicketMergeDialog ticket={ticket} open={mergeOpen} onOpenChange={setMergeOpen} />}
    </header>
  );
}

// ── Conversation ─────────────────────────────────────────────────────

function Conversation({
  ticket,
  mode,
  onModeChange,
  textareaRef,
  composer,
  onInsert,
}: {
  ticket: Ticket;
  mode: ComposerMode;
  onModeChange: (m: ComposerMode) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  composer: RefObject<ComposerHandle | null>;
  onInsert: (text: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const knowledge = useRef<HTMLElement>(null);

  // Open on the latest message with the composer under it (suggestions just below), and follow new replies and notes.
  useEffect(() => {
    const box = scroller.current;
    if (!box || !knowledge.current) return;
    const last = box.querySelector<HTMLElement>("ol > li:last-child");
    // Short panes (small tablets, landscape phones) can't fit both — open on the latest message there.
    const top = box.clientHeight < 420 && last ? last.offsetTop : knowledge.current.offsetTop - box.clientHeight;
    box.scrollTo({ top: Math.max(0, top) });
  }, [ticket.messages.length]);

  return (
    <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto scrollbar-thin">
      <ol aria-label="Conversation">
        {ticket.messages.map((m, i) => (
          <TicketMessage key={m.id} message={m} isFirst={i === 0} contactEmail={ticket.contact.email} onQuote={onInsert} />
        ))}
      </ol>
      {/* Stays in reach while scrolling back through the thread — on screens tall enough to leave the thread room. */}
      <div className="bottom-0 z-10 space-y-3 bg-card px-4 pt-3 pb-4 [@media(min-height:800px)]:sticky">
        <TypingIndicator ticketId={ticket.id} />
        <TicketComposer ticket={ticket} mode={mode} onModeChange={onModeChange} textareaRef={textareaRef} handle={composer} />
      </div>
      <SuggestedKnowledge ref={knowledge} ticket={ticket} onInsert={(a) => onInsert(articleLink(a))} />
    </div>
  );
}

// ── Suggested knowledge ──────────────────────────────────────────────

function SuggestedKnowledge({ ticket, onInsert, ref }: { ticket: Ticket; onInsert: (a: KnowledgeArticle) => void; ref: Ref<HTMLElement> }) {
  const [all, setAll] = useState(false);
  const suggested = suggestArticles(ticket, 4);
  const articles = all ? [...suggested, ...KNOWLEDGE_ARTICLES.filter((a) => !suggested.includes(a))] : suggested.slice(0, 2);

  return (
    <section ref={ref} aria-label="Suggested knowledge" className="border-t border-line-soft px-4 pt-4 pb-5">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h3 className="text-label font-semibold text-ink">{all ? "Knowledge articles" : "Suggested knowledge"}</h3>
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded text-label font-normal text-ink-body hover:text-desk focus-visible:outline-2 focus-visible:outline-desk-action"
        >
          {all ? "Show suggested" : "View all"}
          <ArrowRightIcon size={14} aria-hidden />
        </button>
      </div>
      {articles.length ? (
        <ul className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
          {articles.map((a) => (
            <li key={a.id} className="flex min-w-0 gap-3 rounded-xl border border-line-soft p-3">
              <span className="self-start">
                <IconTile tone="blue" size={36}>
                  <FileTextIcon size={20} aria-hidden />
                </IconTile>
              </span>
              <div className="min-w-0 flex-1">
                <Popover>
                  <PopoverTrigger className="text-left text-table-cell font-semibold text-ink hover:text-desk focus-visible:outline-2 focus-visible:outline-desk-action">
                    {a.title}
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80">
                    <p className="text-label font-semibold text-ink">{a.title}</p>
                    <p className="text-body text-ink-body">{a.body}</p>
                    <p className="text-caption text-ink-muted">Used {a.uses} times</p>
                  </PopoverContent>
                </Popover>
                <p className="line-clamp-2 text-table-cell-secondary text-ink-muted">{a.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => onInsert(a)}
                aria-label={`Insert ${a.title}`}
                className="h-8 shrink-0 self-end rounded-lg border border-line bg-card px-3 text-button-sm text-ink transition-colors hover:border-desk hover:text-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
              >
                Insert
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-1 text-table-cell-secondary text-ink-muted">No articles match this ticket — use View all to browse.</p>
      )}
    </section>
  );
}

// ── Loading ──────────────────────────────────────────────────────────

function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading ticket" className="space-y-4 p-5">
      <Skeleton className="h-6 w-4/5" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-10 w-full" />
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3 py-2">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}
