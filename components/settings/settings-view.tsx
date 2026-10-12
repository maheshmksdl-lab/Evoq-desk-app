"use client";

import { useState } from "react";
import type { Icon } from "@phosphor-icons/react";
import { BellIcon, ChatTextIcon, ClockIcon, PencilSimpleIcon, PlusIcon, TrashIcon, UserCircleIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DrawerActions, DrawerSection, FormField, PageShell, Pill, PrimaryButton, SearchBox, SecondaryButton, SideDrawer, fieldClass } from "@/components/shared/desk-ui";
import { bodyCell, ConfirmDialog, headCell, ModuleHeader, Panel, Switch, useDrawer } from "@/components/shared/module-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { EmptyState } from "@/components/shared/state-panels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteSavedReply,
  useNotificationPrefs,
  useProfile,
  useSaveSavedReply,
  useSlaPolicies,
  useTeamMembers,
  useUpdateAgent,
  useUpdateNotificationPrefs,
  useUpdateProfile,
  useUpdateSlaPolicy,
} from "@/hooks/use-desk-modules";
import { useHydrated } from "@/hooks/use-hydrated";
import { useSavedReplies } from "@/hooks/use-saved-replies";
import { useUrlState } from "@/hooks/use-url-state";
import type { NotificationPrefs, Profile, TeamMember } from "@/lib/api/settings";
import { formatDuration } from "@/lib/format";
import type { NotificationKind } from "@/lib/mock-data/notifications";
import { slaPolicySchema, TIMEZONES, type ProfileInput, type SlaPolicy } from "@/lib/schemas/desk";
import { SAVED_REPLY_CATEGORIES, savedReplySchema } from "@/lib/schemas/entities";
import { PRIORITY_META } from "@/lib/ticket-meta";
import { AGENT_ROLES, AGENT_STATUSES, TICKET_PRIORITIES, type SavedReply, type TicketPriority } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

type Section = "profile" | "notifications" | "team" | "sla" | "replies";
const SECTIONS: { key: Section; label: string; icon: Icon; hint: string }[] = [
  { key: "profile", label: "My profile", icon: UserCircleIcon, hint: "Availability, time zone and signature" },
  { key: "notifications", label: "Notifications", icon: BellIcon, hint: "What you're alerted about" },
  { key: "team", label: "Team members", icon: UsersThreeIcon, hint: "Agents, teams and roles" },
  { key: "sla", label: "SLA policies", icon: ClockIcon, hint: "Response and resolution targets" },
  { key: "replies", label: "Saved replies", icon: ChatTextIcon, hint: "Canned responses and shortcuts" },
];

const AVAILABILITY_LABEL = { available: "Available", busy: "Busy", away: "Away" } as const;
const AVAILABILITY_DOT = { available: "bg-emerald-500", busy: "bg-amber-500", away: "bg-slate-400" } as const;

/** Settings: personal preferences plus the help desk configuration agents share (Zoho Desk Setup / Deskpro Admin). */
export function SettingsView() {
  const [state, setState] = useUrlState({ tab: "profile" });
  const hydrated = useHydrated();
  const section = (SECTIONS.find((s) => s.key === state.tab) ?? SECTIONS[0]).key;

  return (
    <PageShell>
      <ModuleHeader title="Settings" subtitle="Your preferences and how the help desk works" />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="rounded-2xl border border-line-soft bg-card p-2 shadow-card">
          <ul className="scrollbar-none flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {SECTIONS.map((s) => (
              <li key={s.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setState({ tab: s.key }, { push: true })}
                  aria-current={section === s.key ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    section === s.key ? "bg-desk-10 text-desk" : "text-ink-body hover:bg-desk-depth-10 hover:text-ink",
                  )}
                >
                  <s.icon size={19} weight={section === s.key ? "fill" : "regular"} aria-hidden className="shrink-0" />
                  <span className="min-w-0">
                    <span className={cn("block text-[14px] whitespace-nowrap", section === s.key ? "font-semibold" : "font-medium")}>{s.label}</span>
                    <span className="hidden truncate text-[12px] text-ink-muted lg:block">{s.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          {!hydrated ? (
            <Skeleton className="h-[420px] rounded-2xl" />
          ) : section === "profile" ? (
            <ProfileSection />
          ) : section === "notifications" ? (
            <NotificationsSection />
          ) : section === "team" ? (
            <TeamSection />
          ) : section === "sla" ? (
            <SlaSection />
          ) : (
            <SavedRepliesSection />
          )}
        </div>
      </div>
    </PageShell>
  );
}

// ── Profile ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { data } = useProfile();
  if (!data) return <Skeleton className="h-[420px] rounded-2xl" />;
  return <ProfileForm key={data.agent.status + data.timezone + data.signature} profile={data} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const initial: ProfileInput = { status: profile.agent.status, timezone: profile.timezone, signature: profile.signature };
  const [values, setValues] = useState(initial);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  const tzLabel = (tz: string) => `${tz.replace(/_/g, " ").replace("/", " / ")} (${new Date().toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit" })})`;

  return (
    <Panel title="My profile" bodyClassName="space-y-6 px-5 pt-2 pb-5">
      <div className="flex items-center gap-4">
        <PersonAvatar name={profile.agent.name} src={profile.agent.avatar} size="xl" status={values.status} />
        <div className="min-w-0">
          <p className="text-[18px] font-bold text-ink">{profile.agent.name}</p>
          <p className="text-[14px] text-ink-muted">
            {profile.agent.role} · {profile.team.name}
          </p>
          <p className="text-[14px] text-ink-muted">{profile.agent.email}</p>
        </div>
      </div>

      <fieldset>
        <legend className="text-field-label text-ink-body">Availability</legend>
        <p className="text-caption text-ink-muted">Teammates see this on the Overview and when assigning tickets.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AGENT_STATUSES.map((s) => (
            <label key={s} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] transition-colors", values.status === s ? "border-desk bg-desk-tint text-ink" : "border-line text-ink-body hover:border-desk")}>
              <input type="radio" name="availability" value={s} checked={values.status === s} onChange={() => setValues((v) => ({ ...v, status: s }))} className="sr-only" />
              <span className={cn("size-2.5 rounded-full", AVAILABILITY_DOT[s])} aria-hidden />
              {AVAILABILITY_LABEL[s]}
            </label>
          ))}
        </div>
      </fieldset>

      <FormField label="Time zone" htmlFor="pf-tz" className="max-w-md">
        <Select value={values.timezone} onValueChange={(tz) => setValues((v) => ({ ...v, timezone: tz as ProfileInput["timezone"] }))}>
          <SelectTrigger id="pf-tz" className={fieldClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tzLabel(tz)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Email signature" htmlFor="pf-sig" error={values.signature.length > 500 ? "Keep the signature under 500 characters." : undefined}>
        <textarea id="pf-sig" rows={4} value={values.signature} onChange={(e) => setValues((v) => ({ ...v, signature: e.target.value }))} className={cn(fieldClass, "h-auto resize-y py-2.5 leading-relaxed")} />
        <span className="text-caption text-ink-muted">{values.signature.length}/500</span>
      </FormField>

      <div className="flex justify-end gap-3 border-t border-line-soft pt-4">
        <SecondaryButton disabled={!dirty} onClick={() => setValues(initial)}>
          Discard
        </SecondaryButton>
        <PrimaryButton size="md" disabled={!dirty || update.isPending || values.signature.length > 500} onClick={() => update.mutate(values, { onSuccess: () => toast.success("Profile saved") })}>
          {update.isPending ? "Saving…" : "Save changes"}
        </PrimaryButton>
      </div>
    </Panel>
  );
}

// ── Notifications ────────────────────────────────────────────────────

const KIND_LABEL: Record<NotificationKind, { label: string; hint: string }> = {
  sla: { label: "SLA warnings", hint: "A ticket you own is close to, or past, its target" },
  reply: { label: "Customer replies", hint: "A customer replies on a ticket you own or follow" },
  assigned: { label: "Assignments", hint: "A ticket is assigned to you" },
  mention: { label: "Mentions and notes", hint: "A teammate @mentions you or adds a note" },
};

function NotificationsSection() {
  const { data } = useNotificationPrefs();
  if (!data) return <Skeleton className="h-[360px] rounded-2xl" />;
  return <NotificationsForm key={JSON.stringify(data)} prefs={data} />;
}

function NotificationsForm({ prefs }: { prefs: NotificationPrefs }) {
  const update = useUpdateNotificationPrefs();
  const [values, setValues] = useState(prefs);
  const dirty = JSON.stringify(values) !== JSON.stringify(prefs);
  const set = (channel: "inApp" | "email", kind: NotificationKind, on: boolean) => setValues((v) => ({ ...v, [channel]: { ...v[channel], [kind]: on } }));

  return (
    <Panel title="Notifications" bodyClassName="px-5 pb-5">
      <p className="text-body text-ink-muted">Turning off in-app alerts for a kind also hides it from the bell and the Notifications page.</p>
      <div className="-mx-5 mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th scope="col" className={headCell}>Alert</th>
              <th scope="col" className={cn(headCell, "w-24 text-center")}>In app</th>
              <th scope="col" className={cn(headCell, "w-24 text-center")}>Email</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(KIND_LABEL) as NotificationKind[]).map((k) => (
              <tr key={k}>
                <td className={bodyCell}>
                  <span className="block font-medium text-ink">{KIND_LABEL[k].label}</span>
                  <span className="block text-[13px] text-ink-muted">{KIND_LABEL[k].hint}</span>
                </td>
                <td className={cn(bodyCell, "text-center")}>
                  <Switch checked={values.inApp[k]} onChange={(on) => set("inApp", k, on)} label={`${KIND_LABEL[k].label} in app`} />
                </td>
                <td className={cn(bodyCell, "text-center")}>
                  <Switch checked={values.email[k]} onChange={(on) => set("email", k, on)} label={`${KIND_LABEL[k].label} by email`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-line-soft px-4 py-3">
        <span>
          <span className="block text-[14px] font-medium text-ink">Daily digest</span>
          <span className="block text-caption text-ink-muted">One email at 8:00 AM with your open tickets and SLA risks.</span>
        </span>
        <Switch checked={values.dailyDigest} onChange={(dailyDigest) => setValues((v) => ({ ...v, dailyDigest }))} label="Daily digest email" />
      </div>
      <div className="mt-5 flex justify-end gap-3 border-t border-line-soft pt-4">
        <SecondaryButton disabled={!dirty} onClick={() => setValues(prefs)}>
          Discard
        </SecondaryButton>
        <PrimaryButton size="md" disabled={!dirty || update.isPending} onClick={() => update.mutate(values, { onSuccess: () => toast.success("Notification settings saved") })}>
          {update.isPending ? "Saving…" : "Save changes"}
        </PrimaryButton>
      </div>
    </Panel>
  );
}

// ── Team members ─────────────────────────────────────────────────────

function TeamSection() {
  const { data } = useTeamMembers();
  const drawer = useDrawer<TeamMember>();
  const [team, setTeam] = useState("");
  if (!data) return <Skeleton className="h-[420px] rounded-2xl" />;
  const members = data.members.filter((m) => !team || m.team.id === team);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {data.teams.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTeam(team === t.id ? "" : t.id)}
            aria-pressed={team === t.id}
            className={cn("rounded-2xl border bg-card p-4 text-left shadow-card transition-colors hover:border-desk", team === t.id ? "border-desk ring-1 ring-desk" : "border-line-soft")}
          >
            <span className="block truncate text-[14px] font-semibold text-ink">{t.name}</span>
            <span className="mt-1 block text-[13px] text-ink-muted">
              {t.members} agents · <span className="font-semibold text-ink">{t.openTickets}</span> open
            </span>
          </button>
        ))}
      </div>
      <Panel title={team ? `${data.teams.find((t) => t.id === team)?.name} members` : "All agents"} action={team ? <button type="button" onClick={() => setTeam("")} className="text-[13px] font-medium text-desk">Show all</button> : undefined} bodyClassName="pb-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0">
            <caption className="sr-only">Agents</caption>
            <thead>
              <tr>
                <th scope="col" className={headCell}>Agent</th>
                <th scope="col" className={headCell}>Team</th>
                <th scope="col" className={headCell}>Role</th>
                <th scope="col" className={headCell}>Availability</th>
                <th scope="col" className={cn(headCell, "text-right")}>Open</th>
                <th scope="col" className={headCell}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.agent.id} className="hover:bg-desk-surface">
                  <td className={bodyCell}>
                    <span className="flex items-center gap-3">
                      <PersonAvatar name={m.agent.name} src={m.agent.avatar} size="md" />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{m.agent.name}</span>
                        <span className="block truncate text-[12px] text-ink-muted">{m.agent.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className={bodyCell}>{m.team.name}</td>
                  <td className={bodyCell}>{m.agent.role}</td>
                  <td className={bodyCell}>
                    <span className="inline-flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", AVAILABILITY_DOT[m.agent.status])} aria-hidden />
                      {AVAILABILITY_LABEL[m.agent.status]}
                    </span>
                  </td>
                  <td className={cn(bodyCell, "text-right font-semibold text-ink tabular-nums")}>{m.openTickets}</td>
                  <td className={cn(bodyCell, "text-right")}>
                    <button type="button" onClick={() => drawer.show(m)} aria-label={`Edit ${m.agent.name}`} className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-desk-tint hover:text-desk">
                      <PencilSimpleIcon size={16} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {drawer.item && <AgentDrawer key={drawer.key} open={drawer.open} onOpenChange={drawer.setOpen} member={drawer.item} teams={data.teams} />}
    </div>
  );
}

function AgentDrawer({ open, onOpenChange, member, teams }: { open: boolean; onOpenChange: (o: boolean) => void; member: TeamMember; teams: { id: string; name: string }[] }) {
  const update = useUpdateAgent();
  const [teamId, setTeamId] = useState(member.agent.teamId);
  const [role, setRole] = useState(member.agent.role);
  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      icon={UsersThreeIcon}
      title="Edit agent"
      subtitle={member.agent.name}
      width={480}
      footer={
        <DrawerActions
          onCancel={() => onOpenChange(false)}
          submitLabel={update.isPending ? "Saving…" : "Save"}
          disabled={update.isPending}
          onSubmit={() =>
            update.mutate(
              { id: member.agent.id, input: { teamId, role } },
              {
                onSuccess: () => {
                  toast.success("Agent updated", { description: `${member.agent.name} · ${teams.find((t) => t.id === teamId)?.name}` });
                  onOpenChange(false);
                },
              },
            )
          }
        />
      }
    >
      <DrawerSection title="Membership">
        <div className="grid gap-4">
          <FormField label="Team" htmlFor="ag-team">
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger id="ag-team" className={fieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Role" htmlFor="ag-role">
            <Select value={role} onValueChange={(r) => setRole(r as typeof role)}>
              <SelectTrigger id="ag-role" className={fieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        {teamId !== member.agent.teamId && member.openTickets > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            {member.agent.name} keeps their {member.openTickets} open tickets. Move tickets to the new team from the Inbox if needed.
          </p>
        )}
      </DrawerSection>
    </SideDrawer>
  );
}

// ── SLA policies ─────────────────────────────────────────────────────

function SlaSection() {
  const { data } = useSlaPolicies();
  if (!data) return <Skeleton className="h-[360px] rounded-2xl" />;
  return (
    <Panel title="SLA policies" bodyClassName="px-5 pb-5">
      <p className="text-body text-ink-muted">Targets by priority, in minutes. Changes apply to tickets created from now on — existing tickets keep their original targets.</p>
      <ul className="mt-4 space-y-3">
        {[...TICKET_PRIORITIES].reverse().map((p) => (
          <SlaRow key={`${p}-${data[p].firstResponse}-${data[p].resolution}`} priority={p} policy={data[p]} />
        ))}
      </ul>
    </Panel>
  );
}

function SlaRow({ priority, policy }: { priority: TicketPriority; policy: SlaPolicy }) {
  const update = useUpdateSlaPolicy();
  const [values, setValues] = useState({ firstResponse: String(policy.firstResponse), resolution: String(policy.resolution) });
  const parsed = slaPolicySchema.safeParse({ firstResponse: Number(values.firstResponse), resolution: Number(values.resolution) });
  const dirty = values.firstResponse !== String(policy.firstResponse) || values.resolution !== String(policy.resolution);
  const err = !parsed.success ? parsed.error.issues[0]?.message : undefined;
  const meta = PRIORITY_META[priority];
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-line-soft p-4 lg:flex-row lg:items-end">
      <div className="lg:w-32">
        <span className="inline-flex rounded-full px-3 py-1 text-[13px] font-semibold" style={{ color: meta.color, backgroundColor: meta.bg }}>
          {meta.label}
        </span>
      </div>
      {(["firstResponse", "resolution"] as const).map((k) => (
        <FormField key={k} label={k === "firstResponse" ? "First response (min)" : "Resolution (min)"} htmlFor={`sla-${priority}-${k}`} className="flex-1">
          <input
            id={`sla-${priority}-${k}`}
            type="number"
            min={5}
            inputMode="numeric"
            value={values[k]}
            onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
            className={fieldClass}
          />
          <span className="text-caption text-ink-muted">{Number(values[k]) > 0 ? formatDuration(Number(values[k]) * 60_000) : "—"}</span>
        </FormField>
      ))}
      <div className="flex flex-col items-start gap-1 lg:items-end lg:pb-5">
        <PrimaryButton
          size="md"
          disabled={!dirty || !parsed.success || update.isPending}
          onClick={() => parsed.success && update.mutate({ priority, policy: parsed.data }, { onSuccess: () => toast.success(`${meta.label} SLA updated`, { description: `First response ${formatDuration(parsed.data.firstResponse * 60_000)} · resolution ${formatDuration(parsed.data.resolution * 60_000)}` }) })}
        >
          Save
        </PrimaryButton>
      </div>
      {err && dirty && (
        <p role="alert" className="text-[12px] font-medium text-destructive lg:hidden">
          {err}
        </p>
      )}
      {err && dirty && (
        <p role="alert" className="hidden text-[12px] font-medium text-destructive lg:block lg:w-40">
          {err}
        </p>
      )}
    </li>
  );
}

// ── Saved replies ────────────────────────────────────────────────────

function SavedRepliesSection() {
  const { data } = useSavedReplies();
  const remove = useDeleteSavedReply();
  const drawer = useDrawer<SavedReply>();
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<SavedReply | null>(null);
  if (!data) return <Skeleton className="h-[420px] rounded-2xl" />;
  const term = q.trim().toLowerCase();
  const rows = data.filter((r) => !term || `${r.name} ${r.shortcut} ${r.body} ${r.category}`.toLowerCase().includes(term));

  return (
    <Panel
      title="Saved replies"
      action={
        <PrimaryButton size="md" icon={PlusIcon} onClick={() => drawer.show()} className="h-9">
          New reply
        </PrimaryButton>
      }
      bodyClassName="px-5 pb-5"
    >
      <p className="text-body text-ink-muted">Insert from the composer&apos;s Saved replies menu, or type the shortcut in a reply.</p>
      <SearchBox value={q} onChange={setQ} placeholder="Search saved replies" className="mt-3 sm:w-80" />
      {rows.length ? (
        <ul className="mt-4 divide-y divide-line-soft rounded-xl border border-line-soft">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold text-ink">{r.name}</span>
                  <code className="rounded bg-[#F2F4F7] px-1.5 py-0.5 font-mono text-[12px] text-ink-body">{r.shortcut}</code>
                  <Pill tone="gray" dot={false} className="px-2 py-0.5 text-[11px]">
                    {r.category}
                  </Pill>
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink-muted">{r.body}</p>
                <p className="mt-1 text-[12px] text-ink-faint">Used {r.usageCount} times</p>
              </div>
              <button type="button" onClick={() => drawer.show(r)} aria-label={`Edit ${r.name}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-desk-tint hover:text-desk">
                <PencilSimpleIcon size={16} aria-hidden />
              </button>
              <button type="button" onClick={() => setDeleting(r)} aria-label={`Delete ${r.name}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-[#EF4444]">
                <TrashIcon size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={ChatTextIcon} title="No saved replies match" className="py-10" />
      )}
      <SavedReplyDrawer key={drawer.key} open={drawer.open} onOpenChange={drawer.setOpen} reply={drawer.item} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this saved reply?"
        description={`“${deleting?.name}” (${deleting?.shortcut}) will no longer be available in the composer.`}
        confirmLabel="Delete reply"
        pending={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Saved reply deleted", { description: deleting.name });
              setDeleting(null);
            },
          })
        }
      />
    </Panel>
  );
}

type ReplyValues = Pick<SavedReply, "name" | "shortcut" | "category" | "body">;

function SavedReplyDrawer({ open, onOpenChange, reply }: { open: boolean; onOpenChange: (o: boolean) => void; reply?: SavedReply }) {
  const save = useSaveSavedReply();
  const [values, setValues] = useState<ReplyValues>(() => (reply ? { name: reply.name, shortcut: reply.shortcut, category: reply.category, body: reply.body } : { name: "", shortcut: "/", category: "General", body: "" }));
  const [errors, setErrors] = useState<Partial<Record<keyof ReplyValues, string>>>({});
  const set = <K extends keyof ReplyValues>(k: K, v: ReplyValues[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const submit = () => {
    const parsed = savedReplySchema.pick({ name: true, shortcut: true, category: true, body: true }).safeParse(values);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const i of parsed.error.issues) next[i.path[0] as keyof ReplyValues] ??= i.message;
      setErrors(next);
      return;
    }
    save.mutate(
      { id: reply?.id, input: parsed.data },
      {
        onSuccess: (r) => {
          toast.success(reply ? "Saved reply updated" : "Saved reply created", { description: `${r.name} · ${r.shortcut}` });
          onOpenChange(false);
        },
      },
    );
  };
  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      icon={ChatTextIcon}
      title={reply ? "Edit saved reply" : "New saved reply"}
      subtitle="Reusable text for common answers"
      footer={<DrawerActions onCancel={() => onOpenChange(false)} onSubmit={submit} submitLabel={save.isPending ? "Saving…" : "Save reply"} disabled={save.isPending} />}
    >
      <DrawerSection title="Reply">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="sr-name" error={errors.name}>
              <input id="sr-name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Shipping delay" aria-invalid={!!errors.name} className={fieldClass} />
            </FormField>
            <FormField label="Shortcut" htmlFor="sr-shortcut" error={errors.shortcut}>
              <input id="sr-shortcut" value={values.shortcut} onChange={(e) => set("shortcut", e.target.value)} placeholder="/shipping" aria-invalid={!!errors.shortcut} className={cn(fieldClass, "font-mono")} />
            </FormField>
          </div>
          <FormField label="Category" htmlFor="sr-category">
            <Select value={values.category} onValueChange={(c) => set("category", c as ReplyValues["category"])}>
              <SelectTrigger id="sr-category" className={fieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SAVED_REPLY_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Message" htmlFor="sr-body" error={errors.body}>
            <textarea id="sr-body" rows={8} value={values.body} onChange={(e) => set("body", e.target.value)} aria-invalid={!!errors.body} className={cn(fieldClass, "h-auto resize-y py-2.5 leading-relaxed")} />
          </FormField>
        </div>
      </DrawerSection>
    </SideDrawer>
  );
}
