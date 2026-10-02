"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BuildingsIcon,
  CalendarBlankIcon,
  EnvelopeSimpleIcon,
  IdentificationBadgeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { DetailCard, EditButton, IconField } from "@/components/shared/desk-ui";
import { PersonAvatar } from "@/components/shared/person-avatar";
import type { CustomerContext } from "@/lib/types/ticket";
import { RelatedTickets } from "./related-tickets";

/** Who the customer is, how to reach them, and their history (ServiceOps Customer card). */
export function TicketCustomerPanel({ context }: { context: CustomerContext }) {
  const router = useRouter();
  const { contact, customer, openTickets, totalTickets, recentTickets } = context;
  const since = new Date(customer.customerSince).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <DetailCard
      icon={BuildingsIcon}
      title="Customer"
      action={<EditButton icon={ArrowRightIcon} label="Tickets" aria-label={`View all tickets from ${customer.name}`} onClick={() => router.push(`/tickets?customer=${customer.id}`)} />}
    >
      <div className="mb-5 flex items-start gap-4">
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-xl bg-desk-tint text-desk">
          <BuildingsIcon size={28} weight="duotone" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-label font-bold text-ink">{customer.name}</p>
          <p className="text-body text-ink-body">
            {customer.type} customer{customer.domain ? ` · ${customer.domain}` : ""}
          </p>
          <p className="text-body text-ink-body">
            {openTickets} open · {totalTickets} total tickets
          </p>
        </div>
      </div>
      <dl className="flex flex-col gap-2.5">
        <IconField icon={UserCircleIcon} label="Contact">
          <span className="inline-flex items-center gap-2">
            <PersonAvatar name={contact.name} src={contact.avatar} size="sm" />
            {contact.name}
          </span>
        </IconField>
        <IconField icon={IdentificationBadgeIcon} label="Title">
          {contact.title}
        </IconField>
        <IconField icon={EnvelopeSimpleIcon} label="Email">
          <a href={`mailto:${contact.email}`} className="hover:text-desk hover:underline">
            {contact.email}
          </a>
        </IconField>
        <IconField icon={PhoneIcon} label="Phone">
          <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-desk hover:underline">
            {contact.phone}
          </a>
        </IconField>
        <IconField icon={ShieldCheckIcon} label="Plan">
          {customer.plan}
        </IconField>
        <IconField icon={CalendarBlankIcon} label="Customer since">
          {since}
        </IconField>
      </dl>
      <div className="mt-5 border-t border-line-soft pt-4">
        <p className="mb-2 text-nav-group-label text-ink-muted uppercase">Recent tickets</p>
        <RelatedTickets tickets={recentTickets} empty="This is their first ticket." />
      </div>
    </DetailCard>
  );
}
