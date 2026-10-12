"use client";

import { useState } from "react";
import { BuildingsIcon, UserPlusIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { DrawerActions, DrawerSection, FormField, SideDrawer, fieldClass, type PillTone } from "@/components/shared/desk-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSaveContact, useSaveCustomer } from "@/hooks/use-desk-modules";
import { useLookups } from "@/hooks/use-tickets";
import { contactInputSchema, CUSTOMER_PLANS, customerInputSchema, type ContactInput, type CustomerInput } from "@/lib/schemas/desk";
import { CUSTOMER_STATUSES, CUSTOMER_TYPES, type Contact, type Customer, type CustomerStatus } from "@/lib/types/ticket";

export const CUSTOMER_STATUS_META: Record<CustomerStatus, { label: string; tone: PillTone }> = {
  active: { label: "Active", tone: "green" },
  at_risk: { label: "At risk", tone: "amber" },
  inactive: { label: "Inactive", tone: "gray" },
};

/** Zod issues → first message per field. */
function fieldErrors<K extends string>(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Partial<Record<K, string>> = {};
  for (const issue of issues) out[issue.path[0] as K] ??= issue.message;
  return out;
}

function EnumSelect({ id, value, onChange, options }: { id: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={fieldClass}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const EMPTY_CUSTOMER: CustomerInput = { name: "", domain: "", phone: "", type: "Business", status: "active", plan: "Growth" };

/** Create or edit a customer account. Mount with a fresh `key` per open so the form starts clean. */
export function CustomerDrawer({ open, onOpenChange, customer, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; customer?: Customer; onSaved?: (c: Customer) => void }) {
  const save = useSaveCustomer();
  const [values, setValues] = useState<CustomerInput>(() =>
    customer ? { name: customer.name, domain: customer.domain, phone: customer.phone, type: customer.type, status: customer.status, plan: customer.plan as CustomerInput["plan"] } : EMPTY_CUSTOMER,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInput, string>>>({});
  const set = <K extends keyof CustomerInput>(k: K, v: CustomerInput[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = () => {
    const parsed = customerInputSchema.safeParse(values);
    if (!parsed.success) {
      const next = fieldErrors<keyof CustomerInput>(parsed.error.issues);
      setErrors(next);
      document.getElementById(`cu-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    save.mutate(
      { id: customer?.id, input: parsed.data },
      {
        onSuccess: (c) => {
          toast.success(customer ? "Customer updated" : `${c.name} added`, { description: customer ? c.name : "Add contacts so they can raise tickets." });
          onOpenChange(false);
          onSaved?.(c);
        },
      },
    );
  };

  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      icon={BuildingsIcon}
      title={customer ? "Edit customer" : "New customer"}
      subtitle={customer ? customer.name : "Add an account that contacts support"}
      footer={<DrawerActions onCancel={() => onOpenChange(false)} onSubmit={submit} submitLabel={save.isPending ? "Saving…" : customer ? "Save changes" : "Add customer"} disabled={save.isPending} />}
    >
      <DrawerSection title="Account">
        <div className="grid gap-4">
          <FormField label="Company or person name" htmlFor="cu-name" error={errors.name}>
            <input id="cu-name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Harbor Analytics" aria-invalid={!!errors.name} className={fieldClass} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Domain" htmlFor="cu-domain" error={errors.domain}>
              <input id="cu-domain" value={values.domain} onChange={(e) => set("domain", e.target.value)} placeholder="harbor.example" aria-invalid={!!errors.domain} className={fieldClass} />
            </FormField>
            <FormField label="Phone" htmlFor="cu-phone" error={errors.phone}>
              <input id="cu-phone" value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 010 0000" aria-invalid={!!errors.phone} className={fieldClass} />
            </FormField>
          </div>
        </div>
      </DrawerSection>
      <DrawerSection title="Relationship">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Type" htmlFor="cu-type">
            <EnumSelect id="cu-type" value={values.type} onChange={(v) => set("type", v as CustomerInput["type"])} options={CUSTOMER_TYPES.map((t) => [t, t])} />
          </FormField>
          <FormField label="Plan" htmlFor="cu-plan">
            <EnumSelect id="cu-plan" value={values.plan} onChange={(v) => set("plan", v as CustomerInput["plan"])} options={CUSTOMER_PLANS.map((p) => [p, p])} />
          </FormField>
          <FormField label="Health" htmlFor="cu-status">
            <EnumSelect id="cu-status" value={values.status} onChange={(v) => set("status", v as CustomerInput["status"])} options={CUSTOMER_STATUSES.map((s) => [s, CUSTOMER_STATUS_META[s].label])} />
          </FormField>
        </div>
      </DrawerSection>
    </SideDrawer>
  );
}

/** Create or edit a contact. `customerId` fixes the account when adding from a customer page. */
export function ContactDrawer({
  open,
  onOpenChange,
  contact,
  customerId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contact?: Contact;
  customerId?: string;
}) {
  const save = useSaveContact();
  const { data: lookups } = useLookups();
  const [values, setValues] = useState<ContactInput>(() =>
    contact
      ? { customerId: contact.customerId, name: contact.name, title: contact.title, email: contact.email, phone: contact.phone }
      : { customerId: customerId ?? "", name: "", title: "", email: "", phone: "" },
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ContactInput, string>>>({});
  const set = <K extends keyof ContactInput>(k: K, v: ContactInput[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = () => {
    const parsed = contactInputSchema.safeParse(values);
    if (!parsed.success) {
      const next = fieldErrors<keyof ContactInput>(parsed.error.issues);
      setErrors(next);
      document.getElementById(`co-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    save.mutate(
      { id: contact?.id, input: parsed.data },
      {
        onSuccess: (c) => {
          toast.success(contact ? "Contact updated" : `${c.name} added`, { description: c.email });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      icon={UserPlusIcon}
      title={contact ? "Edit contact" : "New contact"}
      subtitle={contact ? contact.name : "Someone who can raise tickets for a customer"}
      footer={<DrawerActions onCancel={() => onOpenChange(false)} onSubmit={submit} submitLabel={save.isPending ? "Saving…" : contact ? "Save changes" : "Add contact"} disabled={save.isPending} />}
    >
      <DrawerSection title="Customer">
        <FormField label="Customer" htmlFor="co-customerId" error={errors.customerId}>
          <Select value={values.customerId} onValueChange={(v) => set("customerId", v)} disabled={!!customerId && !contact}>
            <SelectTrigger id="co-customerId" className={fieldClass} aria-invalid={!!errors.customerId}>
              <SelectValue placeholder="Choose a customer" />
            </SelectTrigger>
            <SelectContent>
              {lookups?.customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </DrawerSection>
      <DrawerSection title="Person">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="co-name" error={errors.name}>
            <input id="co-name" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Nina Patel" aria-invalid={!!errors.name} className={fieldClass} />
          </FormField>
          <FormField label="Job title" htmlFor="co-title" error={errors.title}>
            <input id="co-title" value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. IT Manager" aria-invalid={!!errors.title} className={fieldClass} />
          </FormField>
          <FormField label="Email" htmlFor="co-email" error={errors.email}>
            <input id="co-email" type="email" value={values.email} onChange={(e) => set("email", e.target.value)} placeholder="name@company.com" aria-invalid={!!errors.email} className={fieldClass} />
          </FormField>
          <FormField label="Phone" htmlFor="co-phone" error={errors.phone}>
            <input id="co-phone" value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 010 0000" aria-invalid={!!errors.phone} className={fieldClass} />
          </FormField>
        </div>
      </DrawerSection>
    </SideDrawer>
  );
}
