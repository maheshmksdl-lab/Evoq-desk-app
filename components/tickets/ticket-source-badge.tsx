import type { Icon } from "@phosphor-icons/react";
import {
  BrowserIcon,
  ChatCircleDotsIcon,
  CodeIcon,
  EnvelopeSimpleIcon,
  GlobeIcon,
  PhoneIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { SOURCE_LABEL } from "@/lib/ticket-meta";
import type { TicketSource } from "@/lib/types/ticket";

export const SOURCE_ICON: Record<TicketSource, Icon> = {
  email: EnvelopeSimpleIcon,
  web_form: BrowserIcon,
  chat: ChatCircleDotsIcon,
  phone: PhoneIcon,
  portal: GlobeIcon,
  api: CodeIcon,
  social: ShareNetworkIcon,
};

/** Channel the ticket arrived through. `iconOnly` keeps the label for screen readers. */
export function TicketSourceBadge({
  source,
  iconOnly = false,
  className,
}: {
  source: TicketSource;
  iconOnly?: boolean;
  className?: string;
}) {
  const IconCmp = SOURCE_ICON[source];
  const label = SOURCE_LABEL[source];
  return (
    <span className={cn("inline-flex items-center gap-1 text-muted-foreground", className)} title={iconOnly ? `Via ${label}` : undefined}>
      <IconCmp size={14} weight="duotone" aria-hidden className="shrink-0" />
      <span className={iconOnly ? "sr-only" : "text-sm"}>{iconOnly ? `Via ${label}` : label}</span>
    </span>
  );
}
