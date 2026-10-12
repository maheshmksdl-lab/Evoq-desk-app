"use client";

import { useState } from "react";
import { LightningIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DrawerActions, DrawerSection, FormField, SideDrawer, fieldClass } from "@/components/shared/desk-ui";
import { Switch } from "@/components/shared/module-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRulePreview, useSaveRule } from "@/hooks/use-desk-modules";
import { useDebounced } from "@/hooks/use-debounced";
import {
  ACTION_LABEL,
  actionOptions,
  CONDITION_FIELDS,
  conditionOptions,
  OPERATOR_LABEL,
  TRIGGER_LABEL,
  type ConditionField,
  type RuleActionType,
  type RuleInput,
  type RuleOperator,
  type RuleTrigger,
} from "@/lib/api/automations";
import { RULE_ACTIONS, RULE_TRIGGERS } from "@/lib/schemas/entities";
import { pluralize } from "@/lib/format";
import type { AutomationRule } from "@/lib/types/ticket";
import { cn } from "@/lib/utils";

const FIELDS = Object.keys(CONDITION_FIELDS) as ConditionField[];
const BLANK: RuleInput = {
  name: "",
  description: "",
  enabled: true,
  trigger: "ticket_created",
  conditions: [{ field: "priority", operator: "is", value: "urgent" }],
  actions: [{ type: "add_tag", value: "" }],
};

function Pick({ id, value, onChange, options, placeholder, className, label }: { id?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; className?: string; label: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={label} className={cn(fieldClass, className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Value control: a list when the field has known values, free text otherwise. */
function ValueInput({ options, value, onChange, label, placeholder }: { options: { value: string; label: string }[] | null; value: string; onChange: (v: string) => void; label: string; placeholder: string }) {
  if (options) return <Pick value={value} onChange={onChange} options={options} placeholder="Choose…" label={label} className="min-w-0 flex-1" />;
  return <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(fieldClass, "min-w-0 flex-1")} />;
}

/** Build or edit a rule: trigger, all-of conditions, actions — with a live count of the open tickets it matches. */
export function RuleDrawer({ open, onOpenChange, rule, duplicate }: { open: boolean; onOpenChange: (o: boolean) => void; rule?: AutomationRule; duplicate?: boolean }) {
  const save = useSaveRule();
  const [values, setValues] = useState<RuleInput>(() =>
    rule
      ? { name: duplicate ? `${rule.name} (copy)` : rule.name, description: rule.description, enabled: duplicate ? false : rule.enabled, trigger: rule.trigger, conditions: rule.conditions.map((c) => ({ ...c })), actions: rule.actions.map((a) => ({ ...a })) }
      : BLANK,
  );
  const [error, setError] = useState<string>();
  const editing = rule && !duplicate;

  const complete = values.conditions.filter((c) => c.value.trim());
  const previewInput = useDebounced({ trigger: values.trigger, conditions: complete }, 250);
  const { data: matches } = useRulePreview(previewInput, open && previewInput.conditions.length > 0);

  const patch = (p: Partial<RuleInput>) => {
    setValues((v) => ({ ...v, ...p }));
    setError(undefined);
  };
  const setCondition = (i: number, p: Partial<RuleInput["conditions"][number]>) => patch({ conditions: values.conditions.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const setAction = (i: number, p: Partial<RuleInput["actions"][number]>) => patch({ actions: values.actions.map((a, j) => (j === i ? { ...a, ...p } : a)) });

  const submit = () => {
    if (values.name.trim().length < 3) return setError("Give the rule a name of at least 3 characters.");
    if (values.conditions.some((c) => !c.value.trim())) return setError("Every condition needs a value.");
    if (values.actions.some((a) => !a.value.trim())) return setError("Every action needs a value.");
    save.mutate(
      { id: editing ? rule.id : undefined, input: { ...values, name: values.name.trim(), description: values.description.trim() } },
      {
        onSuccess: (r) => {
          toast.success(editing ? "Rule updated" : "Rule created", { description: r.name });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      icon={LightningIcon}
      title={editing ? "Edit rule" : duplicate ? "Duplicate rule" : "New rule"}
      subtitle="When something happens and conditions match, Desk does the actions"
      width={640}
      footer={<DrawerActions onCancel={() => onOpenChange(false)} onSubmit={submit} submitLabel={save.isPending ? "Saving…" : editing ? "Save rule" : "Create rule"} disabled={save.isPending} />}
    >
      <DrawerSection title="Rule">
        <div className="grid gap-4">
          <FormField label="Name" htmlFor="ru-name">
            <input id="ru-name" value={values.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Route refund requests to Billing" className={fieldClass} />
          </FormField>
          <FormField label="Description (optional)" htmlFor="ru-desc">
            <input id="ru-desc" value={values.description} maxLength={240} onChange={(e) => patch({ description: e.target.value })} placeholder="What this rule is for" className={fieldClass} />
          </FormField>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line-soft px-4 py-3">
            <span>
              <span className="block text-[14px] font-medium text-ink">Active</span>
              <span className="block text-caption text-ink-muted">Inactive rules are kept but never run.</span>
            </span>
            <Switch checked={values.enabled} onChange={(enabled) => patch({ enabled })} label="Rule active" />
          </div>
        </div>
      </DrawerSection>

      <DrawerSection title="When">
        <Pick id="ru-trigger" label="Trigger" value={values.trigger} onChange={(v) => patch({ trigger: v as RuleTrigger })} options={RULE_TRIGGERS.map((t) => ({ value: t, label: TRIGGER_LABEL[t] }))} />
      </DrawerSection>

      <DrawerSection title="If all of these match">
        <ul className="space-y-2.5">
          {values.conditions.map((c, i) => {
            const field = (FIELDS.includes(c.field as ConditionField) ? c.field : "subject") as ConditionField;
            const options = conditionOptions(field);
            const ops: RuleOperator[] = options ? ["is", "is_not"] : ["contains", "is", "is_not"];
            return (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line-soft p-2.5 sm:flex-nowrap">
                <Pick
                  label={`Condition ${i + 1} field`}
                  value={field}
                  onChange={(v) => {
                    const f = v as ConditionField;
                    setCondition(i, { field: f, value: "", operator: conditionOptions(f) ? "is" : "contains" });
                  }}
                  options={FIELDS.map((f) => ({ value: f, label: CONDITION_FIELDS[f].label }))}
                  className="w-full sm:w-36"
                />
                <Pick label={`Condition ${i + 1} operator`} value={c.operator} onChange={(v) => setCondition(i, { operator: v as RuleOperator })} options={ops.map((o) => ({ value: o, label: OPERATOR_LABEL[o] }))} className="w-28" />
                <ValueInput label={`Condition ${i + 1} value`} options={options} value={c.value} onChange={(value) => setCondition(i, { value })} placeholder={field === "tag" ? "e.g. refund" : "Text to match"} />
                <button
                  type="button"
                  disabled={values.conditions.length === 1}
                  onClick={() => patch({ conditions: values.conditions.filter((_, j) => j !== i) })}
                  aria-label={`Remove condition ${i + 1}`}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-[#EF4444] disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <TrashIcon size={16} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => patch({ conditions: [...values.conditions, { field: "category", operator: "is", value: "" }] })} className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-desk hover:text-desk-press">
          <PlusIcon size={14} weight="bold" aria-hidden /> Add condition
        </button>
        <p className="mt-3 rounded-lg bg-desk-surface px-3 py-2 text-[13px] text-ink-body" aria-live="polite">
          {previewInput.conditions.length === 0
            ? "Add a condition value to see which open tickets match."
            : matches
              ? `${pluralize(matches.length, "open ticket")} match right now${matches.length ? `: ${matches.slice(0, 3).map((t) => `#${t.ticketNumber}`).join(", ")}${matches.length > 3 ? "…" : ""}` : "."}`
              : "Checking open tickets…"}
        </p>
      </DrawerSection>

      <DrawerSection title="Then">
        <ul className="space-y-2.5">
          {values.actions.map((a, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line-soft p-2.5 sm:flex-nowrap">
              <Pick
                label={`Action ${i + 1}`}
                value={a.type}
                onChange={(v) => setAction(i, { type: v as RuleActionType, value: "" })}
                options={RULE_ACTIONS.map((t) => ({ value: t, label: ACTION_LABEL[t] }))}
                className="w-full sm:w-44"
              />
              <ValueInput label={`Action ${i + 1} value`} options={actionOptions(a.type)} value={a.value} onChange={(value) => setAction(i, { value: a.type === "add_tag" ? value.toLowerCase().replace(/\s+/g, "-") : value })} placeholder="e.g. escalated" />
              <button
                type="button"
                disabled={values.actions.length === 1}
                onClick={() => patch({ actions: values.actions.filter((_, j) => j !== i) })}
                aria-label={`Remove action ${i + 1}`}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-[#EF4444] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <TrashIcon size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => patch({ actions: [...values.actions, { type: "set_priority", value: "" }] })} className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-desk hover:text-desk-press">
          <PlusIcon size={14} weight="bold" aria-hidden /> Add action
        </button>
      </DrawerSection>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-destructive">
          {error}
        </p>
      )}
    </SideDrawer>
  );
}
