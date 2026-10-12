"use client";

import { useState } from "react";
import {
  ArrowRightIcon,
  CopySimpleIcon,
  DotsThreeIcon,
  LightningIcon,
  PauseCircleIcon,
  PencilSimpleIcon,
  PlayIcon,
  PlusIcon,
  RobotIcon,
  TicketIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { KpiRow, KpiTile, PageShell, PrimaryButton, SearchBox, SecondaryButton } from "@/components/shared/desk-ui";
import { ConfirmDialog, ModuleHeader, Segmented, Switch, useDrawer } from "@/components/shared/module-ui";
import { EmptyState, ErrorState } from "@/components/shared/state-panels";
import { TimeLabel } from "@/components/shared/time-label";
import { ListSkeleton } from "@/components/customers/customers-view";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDeleteRule, useRules, useRunRule, useToggleRule } from "@/hooks/use-desk-modules";
import { useHydrated } from "@/hooks/use-hydrated";
import { useUrlState } from "@/hooks/use-url-state";
import { ACTION_LABEL, actionOptions, CONDITION_FIELDS, conditionOptions, OPERATOR_LABEL, TRIGGER_LABEL, valueLabel, type ConditionField, type RuleView } from "@/lib/api/automations";
import { pluralize } from "@/lib/format";
import type { AutomationRule } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";
import { RuleDrawer } from "./rule-drawer";

function conditionText(c: AutomationRule["conditions"][number]) {
  const field = c.field as ConditionField;
  return `${CONDITION_FIELDS[field]?.label ?? c.field} ${OPERATOR_LABEL[c.operator]} ${valueLabel(conditionOptions(field), c.value)}`;
}
function actionText(a: AutomationRule["actions"][number]) {
  return `${ACTION_LABEL[a.type]}: ${valueLabel(actionOptions(a.type), a.value)}`;
}

/** Automations: rules that route, prioritise and tag tickets (Zoho Desk workflow rules / Deskpro triggers). */
export function AutomationsView() {
  const [state, setState] = useUrlState({ show: "all", q: "" });
  const hydrated = useHydrated();
  const { data, isPending, isError, refetch } = useRules();
  const toggle = useToggleRule();
  const run = useRunRule();
  const remove = useDeleteRule();
  const drawer = useDrawer<{ rule: AutomationRule; duplicate?: boolean }>();
  const [deleting, setDeleting] = useState<RuleView | null>(null);

  const term = state.q.trim().toLowerCase();
  const rules = (data ?? [])
    .filter((r) => (state.show === "active" ? r.enabled : state.show === "inactive" ? !r.enabled : true))
    .filter((r) => !term || `${r.name} ${r.description}`.toLowerCase().includes(term));
  const active = data?.filter((r) => r.enabled).length ?? 0;

  const runNow = (r: RuleView) =>
    run.mutate(r.id, {
      onSuccess: ({ applied, notified }) =>
        applied
          ? toast.success(`${r.name} applied to ${pluralize(applied, "ticket")}`, { description: notified.length ? `Notified ${notified.join(", ")}.` : "Changes are in each ticket's activity." })
          : toast.info("No open tickets match this rule right now"),
    });

  return (
    <PageShell>
      <ModuleHeader
        title="Automations"
        subtitle="Rules that route, prioritise and tag tickets so agents don't have to"
        actions={
          <PrimaryButton size="md" icon={PlusIcon} onClick={() => drawer.show()}>
            New rule
          </PrimaryButton>
        }
      />

      {!hydrated || isPending ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState title="Unable to load automations" action={<SecondaryButton onClick={() => refetch()}>Try again</SecondaryButton>} />
      ) : (
        <>
          <KpiRow cols="sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile label="Active rules" value={active} tone="desk" icon={LightningIcon} active={state.show === "active"} onClick={() => setState({ show: "active" })} />
            <KpiTile label="Inactive rules" value={data.length - active} tone="gray" icon={PauseCircleIcon} active={state.show === "inactive"} onClick={() => setState({ show: "inactive" })} />
            <KpiTile label="Runs, all time" value={data.reduce((n, r) => n + r.executions, 0).toLocaleString("en-US")} tone="blue" icon={RobotIcon} />
            <KpiTile label="Open tickets matched now" value={data.filter((r) => r.enabled).reduce((n, r) => n + r.matching, 0)} tone="purple" icon={TicketIcon} meta="By active rules" />
          </KpiRow>

          <section aria-label="Rules" className="rounded-2xl border border-line-soft bg-card shadow-card">
            <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <Segmented
                label="Show rules"
                value={state.show as "all" | "active" | "inactive"}
                onChange={(show) => setState({ show })}
                options={[
                  { value: "all", label: "All", count: data.length },
                  { value: "active", label: "Active", count: active },
                  { value: "inactive", label: "Inactive", count: data.length - active },
                ]}
              />
              <SearchBox value={state.q} onChange={(q) => setState({ q })} placeholder="Search rules" className="sm:w-72" />
            </div>
            {rules.length === 0 ? (
              <EmptyState
                icon={RobotIcon}
                title={term || state.show !== "all" ? "No rules match" : "No rules yet"}
                hint={term || state.show !== "all" ? "Try another search or show all rules." : "Create a rule to route or prioritise tickets automatically."}
                action={<SecondaryButton onClick={() => (term || state.show !== "all" ? setState({ q: "", show: "all" }) : drawer.show())}>{term || state.show !== "all" ? "Show all rules" : "New rule"}</SecondaryButton>}
              />
            ) : (
              <ul className="divide-y divide-line-soft border-t border-line">
                {rules.map((r) => (
                  <li key={r.id} className={cn("flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:gap-5", !r.enabled && "bg-[#FAFBFC]")}>
                    <div className="flex min-w-0 flex-1 gap-4">
                      <Switch
                        checked={r.enabled}
                        label={`${r.name} active`}
                        disabled={toggle.isPending}
                        className="mt-0.5"
                        onChange={(enabled) => toggle.mutate({ id: r.id, enabled }, { onSuccess: () => toast.success(enabled ? "Rule turned on" : "Rule turned off", { description: r.name }) })}
                      />
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => drawer.show({ rule: r })} className={cn("text-left text-[15px] leading-6 font-semibold hover:text-desk", r.enabled ? "text-ink" : "text-ink-body")}>
                          {r.name}
                        </button>
                        {r.description && <p className="text-[13px] leading-5 text-ink-muted">{r.description}</p>}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px]">
                          <span className="rounded-md bg-[#EFF6FF] px-2 py-1 font-medium text-[#2563EB]">{TRIGGER_LABEL[r.trigger]}</span>
                          {r.conditions.map((c, i) => (
                            <span key={i} className="rounded-md border border-line px-2 py-1 text-ink-body">
                              {conditionText(c)}
                            </span>
                          ))}
                          <ArrowRightIcon size={14} aria-hidden className="mx-0.5 text-ink-muted" />
                          {r.actions.map((a, i) => (
                            <span key={i} className="rounded-md bg-desk-tint px-2 py-1 font-medium text-desk">
                              {actionText(a)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 pl-[60px] lg:pl-0">
                      <dl className="grid grid-cols-3 gap-4 text-[12px] lg:w-[300px]">
                        <div>
                          <dt className="text-ink-muted">Matches now</dt>
                          <dd className="text-[14px] font-semibold text-ink tabular-nums">{r.matching}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-muted">Runs</dt>
                          <dd className="text-[14px] font-semibold text-ink tabular-nums">{r.executions}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-muted">Last run</dt>
                          <dd className="text-[14px] text-ink">{r.lastExecutedAt ? <TimeLabel iso={r.lastExecutedAt} /> : "Never"}</dd>
                        </div>
                      </dl>
                      <DropdownMenu>
                        <DropdownMenuTrigger aria-label={`Actions for ${r.name}`} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line text-ink-body hover:border-desk hover:text-desk data-[state=open]:border-desk">
                          <DotsThreeIcon size={20} weight="bold" aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl">
                          <DropdownMenuItem disabled={!r.enabled || !r.matching || run.isPending} onSelect={() => runNow(r)}>
                            <PlayIcon size={16} aria-hidden /> Run now on {pluralize(r.matching, "ticket")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => drawer.show({ rule: r })}>
                            <PencilSimpleIcon size={16} aria-hidden /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => drawer.show({ rule: r, duplicate: true })}>
                            <CopySimpleIcon size={16} aria-hidden /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(r)}>
                            <TrashIcon size={16} aria-hidden /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="text-caption text-ink-muted">Run now applies a rule&apos;s actions to the open tickets it matches; each change is recorded in the ticket&apos;s activity under your name.</p>
        </>
      )}

      <RuleDrawer key={drawer.key} open={drawer.open} onOpenChange={drawer.setOpen} rule={drawer.item?.rule} duplicate={drawer.item?.duplicate} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this rule?"
        description={`“${deleting?.name}” will stop running and be removed. This can't be undone.`}
        confirmLabel="Delete rule"
        pending={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Rule deleted", { description: deleting.name });
              setDeleting(null);
            },
          })
        }
      />
    </PageShell>
  );
}
