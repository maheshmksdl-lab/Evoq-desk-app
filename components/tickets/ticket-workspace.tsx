"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  BookOpenTextIcon,
  BuildingsIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  ClockCounterClockwiseIcon,
  ClockIcon,
  CopyIcon,
  DotsThreeIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  FileTextIcon,
  GitMergeIcon,
  GlobeIcon,
  LinkSimpleIcon,
  PaperclipIcon,
  PhoneIcon,
  ProhibitIcon,
  SidebarSimpleIcon,
  TagIcon,
  TicketIcon,
  UserIcon,
  UsersIcon,
  XCircleIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import { DetailCard, SideDrawer } from "@/components/shared/desk-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { useNow } from "@/hooks/use-now";
import { useTicket, useUpdateTicket } from "@/hooks/use-ticket";
import { useLookups } from "@/hooks/use-tickets";
import { focusClock } from "@/lib/sla";
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
import { SlaLeft } from "./ticket-sla-indicator";
import { SOURCE_ICON } from "./ticket-source-badge";
import { TicketSpamNotice } from "./ticket-spam-notice";
import { TicketTags } from "./ticket-tags";

/** Comments shown before "Load More". */
const INITIAL_COMMENTS = 3;

type HeaderMenu = "status" | "assignee" | "priority";
type Section = "customer" | "details" | "related" | "knowledge" | "timeline" | "activity";

/** Where the ticket sits in the list beside it — drives previous / next. */
export interface QueuePosition {
  index: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
}

/**
 * `docked`: beside the ticket table, one surface split by a border.
 * `inbox`: the Inbox's conversation and details cards, beside its conversation list.
 */
type Variant = "docked" | "inbox";

const iconBtn =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-desk-depth-10 hover:text-ink focus-visible:outline-2 focus-visible:outline-desk-action disabled:pointer-events-none disabled:opacity-40 data-[state=open]:bg-desk-depth-10";
/** Bordered header control (status, assignee, more). */
const headerControl = cn(propertyControl, "h-9 px-3 text-[13px]");


async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error(`Couldn't copy ${what.toLowerCase()}`);
  }
}

/**
 * The ticket workspace: the conversation and composer, with the customer,
 * ticket properties, related tickets, suggested knowledge, the customer's
 * history and the ticket's activity in a sidebar beside it. On phones it covers
 * the screen, with a back control to the list.
 */
export function TicketWorkspace({
  ticketId,
  onClose,
  position,
  variant = "docked",
}: {
  ticketId: string;
  onClose: () => void;
  position?: QueuePosition;
  variant?: Variant;
}) {
  const { data: ticket, isPending, isError, refetch } = useTicket(ticketId);
  const inbox = variant === "inbox";

  return (
    <aside
      aria-label={ticket ? `Ticket #${ticket.ticketNumber}` : "Ticket"}
      className={cn(
        "@container relative flex min-w-0 overflow-hidden",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
        inbox
          ? // Phones: the whole screen. Tablet / desktop: the rest of the Inbox beside the list.
            "fixed inset-0 z-50 bg-card md:relative md:inset-auto md:z-auto md:flex-1 md:gap-3 md:bg-transparent"
          : // Phones: the whole screen. Tablet / desktop: full height under the header, beside the list.
            "fixed inset-0 z-50 bg-card motion-safe:slide-in-from-right-6 md:sticky md:inset-auto md:top-16 md:z-auto md:h-[calc(100dvh-64px)] md:border-l md:border-line lg:top-(--header-h) lg:h-[calc(100dvh-var(--header-h))]",
      )}
    >
      {ticket ? (
        <WorkspaceBody key={ticket.id} ticket={ticket} onClose={onClose} position={position} variant={variant} />
      ) : (
        <div className={cn("flex min-w-0 flex-1 flex-col bg-card", inbox && "md:rounded-2xl md:border md:border-line-soft md:shadow-card")}>
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
        </div>
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
      <ArrowLeftIcon size={16} aria-hidden /> Back
    </button>
  );
}

function WorkspaceBody({ ticket, onClose, position, variant }: { ticket: Ticket; onClose: () => void; position?: QueuePosition; variant: Variant }) {
  const inbox = variant === "inbox";
  const [mode, setMode] = useState<ComposerMode>("public");
  const [menu, setMenu] = useState<HeaderMenu | null>(null);
  // Below 840px of workspace width the details sidebar is closed until asked for (it sits beside the conversation above that).
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sections, setSections] = useState<Set<Section>>(() => new Set<Section>(["customer", "details"]));
  const [drawer, setDrawer] = useState<"profile" | "edit" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composer = useRef<ComposerHandle>(null);

  const toggleSection = (s: Section) =>
    setSections((prev) => {
      const next = new Set(prev);
      if (!next.delete(s)) next.add(s);
      return next;
    });

  const focusComposer = (m: ComposerMode) => {
    setMode(m);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };
  const insert = (text: string) => requestAnimationFrame(() => composer.current?.insert(text));

  // Shortcuts (R, N, A, S) and the command menu act on the open ticket.
  useRegisterAction("reply", () => focusComposer("public"));
  useRegisterAction("internal-note", () => focusComposer("internal"));
  useRegisterAction("assign", () => setMenu("assignee"));
  useRegisterAction("change-status", () => setMenu("status"));
  useRegisterAction("change-priority", () => setMenu("priority"));
  useRegisterAction("add-tag", () => {
    setDetailsOpen(true);
    setSections((prev) => new Set(prev).add("details"));
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-add-tag]")?.click());
  });

  const card = inbox ? "md:rounded-2xl md:border md:border-line-soft md:shadow-card" : "";

  return (
    <>
      {/* ── Conversation ── */}
      <section aria-label="Conversation" className={cn("flex min-w-0 flex-1 flex-col overflow-hidden bg-card", card)}>
        <WorkspaceHeader
          ticket={ticket}
          onClose={onClose}
          position={position}
          menu={menu}
          onMenu={setMenu}
          closable={!inbox}
          detailsOpen={detailsOpen}
          onToggleDetails={() => setDetailsOpen((o) => !o)}
        />
        <Conversation ticket={ticket} mode={mode} onModeChange={setMode} textareaRef={textareaRef} composer={composer} onInsert={insert} />
      </section>

      {/* ── Details sidebar: beside the conversation when there's room, over it when there isn't ── */}
      <aside
        aria-label="Ticket details"
        className={cn(
          "min-h-0 flex-col overflow-y-auto bg-card scrollbar-thin",
          detailsOpen ? "absolute inset-y-0 right-0 z-20 flex w-[min(360px,100%)] border-l border-line shadow-[-12px_0_32px_rgba(16,24,40,0.10)]" : "hidden",
          "@min-[840px]:static @min-[840px]:flex @min-[840px]:w-[360px] @min-[840px]:shrink-0 @min-[840px]:shadow-none",
          inbox ? "@min-[840px]:rounded-2xl @min-[840px]:border @min-[840px]:border-line-soft @min-[840px]:shadow-card" : "@min-[840px]:border-l @min-[840px]:border-line",
        )}
      >
        <div className={cn("flex items-center justify-between border-b border-line-soft px-5 py-3", "@min-[840px]:hidden")}>
          <span className="text-[15px] font-semibold text-ink">Details</span>
          <button type="button" onClick={() => setDetailsOpen(false)} aria-label="Close details" className={iconBtn}>
            <XIcon size={18} aria-hidden />
          </button>
        </div>
        <DetailsPanel
          ticket={ticket}
          sections={sections}
          onToggle={toggleSection}
          onProfile={() => setDrawer("profile")}
          onEdit={() => setDrawer("edit")}
          onInsertArticle={(a) => insert(articleLink(a))}
        />
      </aside>

      <SideDrawer open={drawer === "profile"} onOpenChange={(o) => setDrawer(o ? "profile" : null)} title={ticket.contact.name} subtitle={ticket.customer.name} icon={UserIcon}>
        <TicketCustomerPanel context={ticket.customerContext} />
      </SideDrawer>
      <SideDrawer open={drawer === "edit"} onOpenChange={(o) => setDrawer(o ? "edit" : null)} title={`Edit #${ticket.ticketNumber}`} subtitle={ticket.subject} icon={ClipboardTextIcon}>
        <TicketProperties ticket={ticket} />
        <TicketSlaCard sla={ticket.sla} status={ticket.status} />
        <DetailCard icon={PaperclipIcon} title="Attachments">
          {ticket.attachments.length ? (
            <AttachmentList attachments={ticket.attachments} />
          ) : (
            <p className="text-body text-ink-muted">Files shared in the conversation appear here.</p>
          )}
        </DetailCard>
      </SideDrawer>
    </>
  );
}

// ── Header ───────────────────────────────────────────────────────────

function WorkspaceHeader({
  ticket,
  onClose,
  position,
  menu,
  onMenu,
  closable,
  detailsOpen,
  onToggleDetails,
}: {
  ticket: Ticket;
  onClose: () => void;
  position?: QueuePosition;
  menu: HeaderMenu | null;
  onMenu: (m: HeaderMenu | null) => void;
  closable: boolean;
  detailsOpen: boolean;
  onToggleDetails: () => void;
}) {
  const actions = useTicketActions(ticket);
  const update = useUpdateTicket();
  const [mergeOpen, setMergeOpen] = useState(false);
  const status = STATUS_META[ticket.status];
  const priority = PRIORITY_META[ticket.priority];
  const following = ticket.followers.some((f) => f.id === CURRENT_AGENT_ID);
  const done = ticket.status === "resolved" || ticket.status === "closed";
  const menuProps = (key: HeaderMenu) => ({ open: menu === key, onOpenChange: (o: boolean) => onMenu(o ? key : null) });

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
    <header className="shrink-0 border-b border-line-soft px-5 pt-4 pb-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <BackButton onClose={onClose} />
        <span className="text-[20px] leading-7 font-medium whitespace-nowrap text-ink-muted">#{ticket.ticketNumber}</span>
        <DropdownMenu {...menuProps("priority")}>
          <DropdownMenuTrigger
            aria-label={`Priority: ${priority.label}. Change priority`}
            className="inline-flex h-7 items-center rounded-full px-3 text-[13px] font-medium transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
            style={{ color: priority.color, backgroundColor: priority.bg }}
          >
            {priority.label}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <PriorityMenuItems value={ticket.priority} onChange={actions.setPriority} />
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu {...menuProps("status")}>
            <DropdownMenuTrigger className={cn(headerControl, "gap-3")} aria-label={`Status: ${status.label}. Change status`}>
              {status.label}
              <CaretDownIcon size={13} aria-hidden className="text-ink-muted" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <StatusMenuItems value={ticket.status} onChange={actions.setStatus} />
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu {...menuProps("assignee")}>
            <DropdownMenuTrigger
              className={cn(headerControl, "max-w-[180px] gap-2.5 pl-1.5 @max-md:max-w-[52px]")}
              aria-label={`Assignee: ${ticket.assignee?.name ?? "Unassigned"}. Change assignee`}
            >
              <PersonAvatar name={ticket.assignee?.name ?? null} src={ticket.assignee?.avatar} size="sm" />
              <span className={cn("truncate @max-md:hidden", !ticket.assignee && "text-ink-muted")}>{ticket.assignee?.name ?? "Assign"}</span>
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
          <button
            type="button"
            onClick={onToggleDetails}
            aria-label={detailsOpen ? "Hide details" : "Show details"}
            aria-pressed={detailsOpen}
            title="Details"
            className={cn(headerControl, "w-9 justify-center px-0", "@min-[840px]:hidden", detailsOpen && "border-desk text-desk")}
          >
            <SidebarSimpleIcon size={18} aria-hidden className="-scale-x-100" />
          </button>
          {closable && (
            <button type="button" onClick={onClose} aria-label="Close ticket" title="Close (Esc)" className={cn(iconBtn, "max-md:hidden")}>
              <XIcon size={20} aria-hidden />
            </button>
          )}
        </div>
      </div>

      <h2 className="mt-2 text-[22px] leading-8 font-bold tracking-tight text-ink">{ticket.subject}</h2>
      <p className="mt-0.5 text-[15px] leading-6 text-ink-muted">
        Created <TimeLabel iso={ticket.createdAt} /> via {SOURCE_LABEL[ticket.source]}
        <span className="mx-2.5" aria-hidden>
          •
        </span>
        Updated <TimeLabel iso={ticket.updatedAt} />
      </p>
      <TicketCollaboration ticket={ticket} className="mt-2" />
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
  const list = useRef<HTMLOListElement>(null);
  const count = ticket.messages.length;
  const [showAll, setShowAll] = useState(false);
  const [seen, setSeen] = useState(count);
  // A reply or note was just added: show the whole thread so the agent sees it land.
  if (count !== seen) {
    setSeen(count);
    if (count > seen) setShowAll(true);
  }
  const visible = showAll ? ticket.messages : ticket.messages.slice(0, INITIAL_COMMENTS);
  const hidden = count - visible.length;

  // …and bring the new message into view. Only when the count grew — on open the thread starts at the top.
  const shownCount = useRef(count);
  useEffect(() => {
    const grew = count > shownCount.current;
    shownCount.current = count;
    if (!grew) return;
    const last = list.current?.lastElementChild as HTMLElement | null;
    if (scroller.current && last) scroller.current.scrollTo({ top: Math.max(0, last.offsetTop - 16), behavior: "smooth" });
  }, [count]);

  const loadMore = () => {
    setShowAll(true);
    // Keep the reader's place: focus the first comment that was just revealed.
    requestAnimationFrame(() => (list.current?.children[INITIAL_COMMENTS] as HTMLElement | undefined)?.focus({ preventScroll: true }));
  };

  return (
    <>
      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <ol ref={list} aria-label="Conversation" className="space-y-5 px-4 py-5 sm:px-5">
          {visible.map((m, i) => (
            <TicketMessage key={m.id} message={m} isFirst={i === 0} contactEmail={ticket.contact.email} onQuote={onInsert} />
          ))}
        </ol>
        {hidden > 0 && (
          <div className="flex items-center justify-center gap-2 px-5 pb-5">
            <button
              type="button"
              onClick={loadMore}
              aria-label={`Load ${hidden} more ${hidden === 1 ? "comment" : "comments"}`}
              className="h-8 rounded-full border border-line bg-card px-4 text-[13px] font-semibold text-desk transition-colors hover:border-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
            >
              Load {hidden} more {hidden === 1 ? "comment" : "comments"}
            </button>
          </div>
        )}
        <TypingIndicator ticketId={ticket.id} className="px-5 pb-3" />
      </div>
      <div className="shrink-0 border-t border-line-soft px-4 pt-1 pb-4 sm:px-5">
        <TicketComposer ticket={ticket} mode={mode} onModeChange={onModeChange} textareaRef={textareaRef} handle={composer} />
      </div>
    </>
  );
}

// ── Details sidebar ──────────────────────────────────────────────────

function PanelSection({
  id,
  icon: IconCmp,
  title,
  count,
  action,
  open,
  onToggle,
  children,
}: {
  id: Section;
  icon: Icon;
  title: string;
  count?: number;
  action?: ReactNode;
  open: boolean;
  onToggle: (s: Section) => void;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`ws-${id}`} className="border-b border-line-soft last:border-b-0">
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          id={`ws-${id}`}
          onClick={() => onToggle(id)}
          aria-expanded={open}
          aria-controls={`ws-${id}-body`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
        >
          <IconCmp size={20} aria-hidden className="shrink-0 text-ink-body" />
          <span className="truncate text-[16px] leading-6 font-semibold text-ink">{title}</span>
          {count !== undefined && <span className="rounded-md bg-muted px-2 text-[12px] leading-5 font-semibold text-ink-body tabular-nums">{count}</span>}
        </button>
        {action}
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-body hover:bg-desk-depth-10 focus-visible:outline-2 focus-visible:outline-desk-action"
        >
          {open ? <CaretUpIcon size={16} aria-hidden /> : <CaretDownIcon size={16} aria-hidden />}
        </button>
      </div>
      {open && (
        <div id={`ws-${id}-body`} className="px-5 pb-5">
          {children}
        </div>
      )}
    </section>
  );
}

const panelControl = cn(propertyControl, "h-9 w-full justify-between gap-1 px-1.5 [&>svg]:size-2.5");

function DetailsPanel({
  ticket,
  sections,
  onToggle,
  onProfile,
  onEdit,
  onInsertArticle,
}: {
  ticket: Ticket;
  sections: Set<Section>;
  onToggle: (s: Section) => void;
  onProfile: () => void;
  onEdit: () => void;
  onInsertArticle: (a: KnowledgeArticle) => void;
}) {
  const actions = useTicketActions(ticket);
  const { data: lookups } = useLookups();
  const now = useNow();
  const { contact, customer, openTickets, totalTickets, recentTickets } = ticket.customerContext;
  const status = STATUS_META[ticket.status];
  const priority = PRIORITY_META[ticket.priority];
  const SourceIcon = SOURCE_ICON[ticket.source];
  const suggested = suggestArticles(ticket, 4);
  const clock = focusClock(ticket.sla);
  const section = (id: Section) => ({ id, open: sections.has(id), onToggle });

  return (
    <div>
      <PanelSection {...section("customer")} icon={UserIcon} title="Customer">
        <div className="flex items-center gap-3.5">
          <PersonAvatar name={contact.name} src={contact.avatar} size="xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] leading-6 font-semibold text-ink">{contact.name}</p>
            <p className="truncate text-[14px] leading-5 text-ink-muted">{customer.name}</p>
          </div>
          <button
            type="button"
            onClick={onProfile}
            className="h-9 shrink-0 rounded-lg border border-line bg-card px-3 text-[13px] font-medium text-ink transition-colors hover:border-desk hover:text-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
          >
            View profile
          </button>
        </div>
        <ul className="mt-4 space-y-2.5 text-[14px] leading-5 text-ink-body">
          <ContactRow icon={EnvelopeSimpleIcon} href={`mailto:${contact.email}`} copyLabel="Email" copyText={contact.email}>
            {contact.email}
          </ContactRow>
          {contact.phone && (
            <ContactRow icon={PhoneIcon} href={`tel:${contact.phone.replace(/\s/g, "")}`} copyLabel="Phone number" copyText={contact.phone}>
              {contact.phone}
            </ContactRow>
          )}
          {customer.domain && <ContactRow icon={GlobeIcon}>{customer.domain}</ContactRow>}
          <ContactRow icon={BuildingsIcon}>
            {customer.name}
            {customer.plan && <span className="text-ink-muted"> · {customer.plan}</span>}
          </ContactRow>
        </ul>
      </PanelSection>

      <PanelSection
        {...section("details")}
        icon={ClipboardTextIcon}
        title="Ticket details"
        action={
          <button type="button" onClick={onEdit} className="shrink-0 rounded text-[14px] font-medium text-desk hover:text-desk-press focus-visible:outline-2 focus-visible:outline-desk-action">
            Edit
          </button>
        }
      >
        <dl className="-mx-1 grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-3 text-[13px]">
          <dt className="text-ink-muted">Status</dt>
          <dd className="min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger className={panelControl} aria-label={`Status: ${status.label}. Change status`}>
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <span className={cn("size-2 shrink-0 rounded-full", status.dot)} aria-hidden />
                  {status.label}
                </span>
                <CaretDownIcon size={12} aria-hidden className="shrink-0 text-ink-muted" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <StatusMenuItems value={ticket.status} onChange={actions.setStatus} />
              </DropdownMenuContent>
            </DropdownMenu>
          </dd>
          <dt className="text-ink-muted">Priority</dt>
          <dd className="min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger className={panelControl} aria-label={`Priority: ${priority.label}. Change priority`}>
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: priority.color }} aria-hidden />
                  {priority.label}
                </span>
                <CaretDownIcon size={12} aria-hidden className="shrink-0 text-ink-muted" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <PriorityMenuItems value={ticket.priority} onChange={actions.setPriority} />
              </DropdownMenuContent>
            </DropdownMenu>
          </dd>

          <dt className="text-ink-muted">Assignee</dt>
          <dd className="min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(panelControl, "pl-1.5")} aria-label={`Assignee: ${ticket.assignee?.name ?? "Unassigned"}. Change assignee`}>
                <span className="flex min-w-0 items-center gap-2">
                  <PersonAvatar name={ticket.assignee?.name ?? null} src={ticket.assignee?.avatar} size="xs" />
                  <span className={cn("truncate", !ticket.assignee && "text-ink-muted")}>{ticket.assignee?.name ?? "Unassigned"}</span>
                </span>
                <CaretDownIcon size={12} aria-hidden className="shrink-0 text-ink-muted" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-[60vh] w-64 overflow-y-auto">
                <AssigneeMenuItems ticket={ticket} onAssign={actions.assign} />
              </DropdownMenuContent>
            </DropdownMenu>
          </dd>
          <dt className="sr-only">Team</dt>
          <dd className="col-span-2 min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger className={panelControl} aria-label={`Team: ${ticket.team.name}. Change team`}>
                <span className="flex min-w-0 items-center gap-2">
                  <UsersIcon size={15} aria-hidden className="shrink-0 text-ink-muted" />
                  <span className="truncate">{ticket.team.name}</span>
                </span>
                <CaretDownIcon size={12} aria-hidden className="shrink-0 text-ink-muted" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuRadioGroup value={ticket.team.id} onValueChange={actions.setTeam}>
                  {(lookups?.teams ?? []).map((t) => (
                    <DropdownMenuRadioItem key={t.id} value={t.id}>
                      {t.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </dd>

          <dt className="text-ink-muted">Channel</dt>
          <dd className="min-w-0">
            <span className="inline-flex h-9 max-w-full items-center gap-2 rounded-lg border border-line px-2.5 text-[13px] font-medium text-ink">
              <SourceIcon size={16} aria-hidden className="shrink-0 text-[#3B82F6]" />
              <span className="truncate">{SOURCE_LABEL[ticket.source]}</span>
            </span>
          </dd>
          <dt className="text-ink-muted">SLA</dt>
          <dd className="min-w-0">
            {clock.state === "met" || clock.state === "paused" ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted" title={`${clock.label} target`}>
                {clock.state === "met" ? <CheckCircleIcon size={16} aria-hidden /> : <ClockIcon size={16} aria-hidden />}
                {clock.state === "met" ? "Met" : "Paused"}
              </span>
            ) : (
              <SlaLeft sla={ticket.sla} now={now} className="text-[14px] font-semibold [&_svg]:size-[18px]" />
            )}
          </dd>

          <dt className="self-start pt-1.5 text-ink-muted">Tags</dt>
          <dd className="col-span-3 min-w-0">
            <TicketTags ticketId={ticket.id} tags={ticket.tags} />
          </dd>
        </dl>
      </PanelSection>

      <PanelSection {...section("related")} icon={TicketIcon} title="Related tickets" count={ticket.relatedTickets.length}>
        <RelatedTickets tickets={ticket.relatedTickets} empty="No related tickets linked." />
      </PanelSection>

      <PanelSection {...section("knowledge")} icon={BookOpenTextIcon} title="Suggested knowledge" count={suggested.length}>
        <SuggestedKnowledge suggested={suggested} onInsert={onInsertArticle} />
      </PanelSection>

      <PanelSection {...section("timeline")} icon={ClockIcon} title="Customer timeline">
        <p className="mb-3 text-[13px] text-ink-muted">
          {openTickets} open · {totalTickets} total tickets from {customer.name}
        </p>
        <RelatedTickets tickets={recentTickets} empty="This is their first ticket." />
      </PanelSection>

      <PanelSection {...section("activity")} icon={ClockCounterClockwiseIcon} title="Activity">
        <TicketActivity activities={ticket.activities} />
      </PanelSection>
    </div>
  );
}

function ContactRow({ icon: IconCmp, href, copyLabel, copyText, children }: { icon: Icon; href?: string; copyLabel?: string; copyText?: string; children: ReactNode }) {
  return (
    <li className="group/row flex min-w-0 items-center gap-3">
      <IconCmp size={19} aria-hidden className="shrink-0 text-ink-body" />
      {href ? (
        <a href={href} className="min-w-0 flex-1 truncate hover:text-desk">
          {children}
        </a>
      ) : (
        <span className="min-w-0 flex-1 truncate">{children}</span>
      )}
      {copyText && (
        <button
          type="button"
          onClick={() => copy(copyText, copyLabel ?? "Text")}
          aria-label={`Copy ${copyLabel?.toLowerCase()}`}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded text-ink-muted opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-desk-action"
        >
          <CopyIcon size={14} aria-hidden />
        </button>
      )}
    </li>
  );
}

function SuggestedKnowledge({ suggested, onInsert }: { suggested: KnowledgeArticle[]; onInsert: (a: KnowledgeArticle) => void }) {
  const [all, setAll] = useState(false);
  const articles = all ? [...suggested, ...KNOWLEDGE_ARTICLES.filter((a) => !suggested.includes(a))] : suggested;

  return (
    <div>
      {articles.length ? (
        <ul className="space-y-2.5">
          {articles.map((a) => (
            <li key={a.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-line-soft p-3">
              <FileTextIcon size={18} aria-hidden className="mt-0.5 shrink-0 text-[#3B82F6]" />
              <div className="min-w-0 flex-1">
                <Popover>
                  <PopoverTrigger className="text-left text-[13px] leading-5 font-semibold text-ink hover:text-desk focus-visible:outline-2 focus-visible:outline-desk-action">
                    {a.title}
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80">
                    <p className="text-label font-semibold text-ink">{a.title}</p>
                    <p className="text-body text-ink-body">{a.body}</p>
                    <p className="text-caption text-ink-muted">Used {a.uses} times</p>
                  </PopoverContent>
                </Popover>
                <p className="line-clamp-2 text-[12px] leading-4 text-ink-muted">{a.summary}</p>
              </div>
              <button
                type="button"
                onClick={() => onInsert(a)}
                aria-label={`Insert ${a.title}`}
                className="h-7 shrink-0 rounded-lg border border-line bg-card px-2.5 text-[12px] font-medium text-ink transition-colors hover:border-desk hover:text-desk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desk-action"
              >
                Insert
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-ink-muted">No articles match this ticket.</p>
      )}
      <button
        type="button"
        onClick={() => setAll((v) => !v)}
        className="mt-3 rounded text-[13px] font-medium text-desk hover:text-desk-press focus-visible:outline-2 focus-visible:outline-desk-action"
      >
        {all ? "Show suggested only" : "Browse all articles"}
      </button>
    </div>
  );
}

// ── Loading ──────────────────────────────────────────────────────────

function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading ticket" className="space-y-4 p-5">
      <Skeleton className="h-6 w-4/5" />
      <Skeleton className="h-4 w-1/2" />
      {[0, 1, 2].map((i) => (
        <div key={i} className={cn("flex gap-3 py-2", i === 1 && "flex-row-reverse")}>
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <Skeleton className="h-16 w-3/5 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
