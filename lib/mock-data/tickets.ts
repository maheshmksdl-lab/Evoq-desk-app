import type {
  ActivityType,
  Attachment,
  TicketActivity,
  TicketCategory,
  TicketMessage,
  TicketPriority,
  TicketRecord,
  TicketSource,
  TicketStatus,
  TicketType,
} from "@/lib/types/ticket";
import { AGENTS, TEAMS } from "./agents";
import { CONTACTS } from "./customers";

/**
 * Ticket seeds use minute offsets relative to "now", so SLA clocks and
 * relative timestamps look live whenever the app is opened.
 *   ago   — minutes in the past
 *   dueIn — minutes in the future (negative = already past)
 */
const H = 60;
const D = 24 * H;

type AttachmentSeed = [name: string, size: number, mimeType: string];

interface MessageSeed {
  ago: number;
  /** "c" ticket contact · "c:<contactId>" another contact · "a:<agentId>" public reply · "n:<agentId>" internal note */
  from: string;
  body: string;
  files?: AttachmentSeed[];
}

interface EventSeed {
  ago: number;
  type: ActivityType;
  description: string;
  actor: string;
}

interface TicketSeed {
  n: number;
  subject: string;
  contact: string;
  assignee: string | null;
  team: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  category: TicketCategory;
  source: TicketSource;
  tags: string[];
  related?: number[];
  followers?: string[];
  /** Override the policy-derived first response / resolution targets. */
  frDueIn?: number;
  resDueIn?: number;
  resolvedAgo?: number;
  thread: MessageSeed[];
  events?: EventSeed[];
}

/** Targets in minutes from creation, by priority (business-hours simplified). */
export const SLA_POLICY: Record<TicketPriority, { firstResponse: number; resolution: number }> = {
  urgent: { firstResponse: 30, resolution: 8 * H },
  high: { firstResponse: 1 * H, resolution: 24 * H },
  medium: { firstResponse: 4 * H, resolution: 3 * D },
  low: { firstResponse: 8 * H, resolution: 5 * D },
};

const SEEDS: TicketSeed[] = [
  {
    n: 482,
    subject: "Unable to export monthly report",
    contact: "con-michael",
    assignee: "agt-sarah",
    team: "team-tech",
    status: "open",
    priority: "high",
    type: "incident",
    category: "reporting",
    source: "email",
    tags: ["reporting", "export", "customer-impact"],
    related: [391, 284],
    followers: ["agt-daniel"],
    frDueIn: 42,
    resDueIn: 6 * H + 18,
    thread: [
      {
        ago: 2 * H + 20,
        from: "c",
        body:
          "Hi team,\n\nI've been trying to export the monthly operations report for September since this morning. The export spinner runs for about a minute and then I get \"Export failed — please try again later\".\n\nWe need this report for our board pack on Friday, so this is fairly time-sensitive. Smaller weekly exports still work.\n\nThanks,\nMichael",
      },
      {
        ago: 58,
        from: "n:agt-daniel",
        body:
          "Customer is using the legacy reporting module. Exports over ~50k rows hit the 60s gateway timeout there — same pattern as #DK-2026-00391. Suggest offering the async export from the new module as a workaround.",
      },
      {
        ago: 35,
        from: "c",
        body:
          "Adding a screenshot of the error and the browser console log in case it helps. I tried Chrome and Edge — same result in both.",
        files: [
          ["monthly-report.png", 2_516_582, "image/png"],
          ["error-log.txt", 186_368, "text/plain"],
        ],
      },
    ],
    events: [
      { ago: 2 * H + 17, type: "assigned", description: "Assigned to Sarah Wilson", actor: "Auto-assignment" },
      { ago: 31, type: "priority_changed", description: "Priority changed from Medium to High", actor: "Olivia Thomas" },
      { ago: 31, type: "tag_added", description: "Tag \"customer-impact\" added", actor: "Olivia Thomas" },
    ],
  },
  {
    n: 481,
    subject: "SSO login fails after IdP certificate rotation",
    contact: "con-aaron",
    assignee: null,
    team: "team-tech",
    status: "open",
    priority: "urgent",
    type: "incident",
    category: "security",
    source: "phone",
    tags: ["sso", "login", "customer-impact"],
    thread: [
      {
        ago: 22,
        from: "c",
        body:
          "Called in by Aaron Mills (Information Security Officer).\n\nVertex rotated their Okta signing certificate at 08:00 local time. Since then, all SAML logins fail with \"Invalid signature on assertion\". Roughly 240 clinical staff cannot sign in. They need either the new certificate applied or a temporary password fallback for admins.",
      },
    ],
  },
  {
    n: 480,
    subject: "Invoice shows duplicate charge for September",
    contact: "con-marcus",
    assignee: "agt-emily",
    team: "team-billing",
    status: "open",
    priority: "high",
    type: "problem",
    category: "billing",
    source: "email",
    tags: ["billing", "invoice", "refund-request"],
    thread: [
      {
        ago: 5 * H,
        from: "c",
        body:
          "Hello,\n\nOur September invoice (INV-24-0918) lists the Enterprise platform fee twice — $4,800 on line 1 and again on line 3. Our card was charged $9,600 in total. Could you confirm and refund the duplicate?",
        files: [["invoice.pdf", 430_080, "application/pdf"]],
      },
      {
        ago: 4 * H + 25,
        from: "a:agt-emily",
        body:
          "Hi Marcus,\n\nThank you for flagging this — I can see the duplicate line on INV-24-0918. It was created when the plan renewal and a seat adjustment were processed on the same day.\n\nI've raised a refund request for $4,800 with our finance team. You should see it on your card within 5–7 business days. I'll send a corrected invoice once finance approves the credit.",
      },
      {
        ago: 3 * H + 10,
        from: "n:agt-emily",
        body: "Refund request FIN-2291 submitted. Finance SLA is usually same day — check back before end of shift.",
      },
      {
        ago: 40,
        from: "c",
        body: "Thanks Emily. Could you also confirm the October invoice won't have the same issue? We have auto-pay enabled.",
      },
    ],
  },
  {
    n: 479,
    subject: "Webhook deliveries returning 401 since this morning",
    contact: "con-dbrooks",
    assignee: "agt-james",
    team: "team-integrations",
    status: "open",
    priority: "urgent",
    type: "incident",
    category: "integration",
    source: "api",
    tags: ["webhooks", "api", "customer-impact"],
    related: [469],
    resDueIn: 1 * H + 30,
    thread: [
      {
        ago: 6 * H + 30,
        from: "c",
        body:
          "All webhook deliveries to our shipment endpoint have been failing with 401 Unauthorized since about 03:00 UTC. Nothing changed on our side. Delivery IDs from the last failure: whk_8812a, whk_8812b. This is blocking shipment status updates to our warehouse system.",
      },
      {
        ago: 6 * H + 12,
        from: "a:agt-james",
        body:
          "Hi Daniel,\n\nThanks for the delivery IDs. I can see the 401s on our side. We rotated webhook signing secrets for workspaces on the legacy signing scheme last night — it looks like yours was included.\n\nCould you check whether your endpoint validates the `X-Desk-Signature` header with the old secret? I'm confirming with engineering whether we can restore the previous secret temporarily.",
      },
      {
        ago: 2 * H + 5,
        from: "c",
        body:
          "We validate the signature, yes. We can't deploy a config change until our release window tonight. Is there any way to re-enable the old secret until then? We have about 1,900 queued events.",
      },
      {
        ago: 1 * H + 40,
        from: "n:agt-james",
        body: "Engineering (Platform on-call) can restore the old secret for 24h. Waiting on their confirmation in #platform-oncall.",
      },
    ],
    events: [{ ago: 2 * H, type: "priority_changed", description: "Priority changed from High to Urgent", actor: "James Anderson" }],
  },
  {
    n: 478,
    subject: "How do I add read-only users to a workspace?",
    contact: "con-grace",
    assignee: null,
    team: "team-success",
    status: "open",
    priority: "low",
    type: "question",
    category: "account",
    source: "portal",
    tags: ["user-management"],
    thread: [
      {
        ago: 50,
        from: "c",
        body:
          "We'd like to give our program coordinators view-only access to the enrolment dashboards. Is there a read-only role, and does it count towards our seat limit?",
      },
    ],
  },
  {
    n: 477,
    subject: "Dashboard widgets load slowly for large date ranges",
    contact: "con-laura",
    assignee: "agt-daniel",
    team: "team-tech",
    status: "pending",
    priority: "medium",
    type: "problem",
    category: "technical",
    source: "chat",
    tags: ["performance", "dashboards"],
    thread: [
      {
        ago: 1 * D + 3 * H,
        from: "c",
        body:
          "Our plant output dashboard takes 40+ seconds to load when the date range is set to the last 12 months. It used to take a few seconds.",
      },
      {
        ago: 1 * D + 2 * H + 40,
        from: "a:agt-daniel",
        body:
          "Hi Laura, thanks for reaching out. To narrow this down, could you capture a HAR file while the dashboard loads? Instructions: Developer Tools → Network → reload → right-click → \"Save all as HAR\". Please also let me know roughly how many widgets are on the dashboard.",
      },
      {
        ago: 1 * D + 2 * H,
        from: "c",
        body: "Sure, I'll get the HAR file from the plant floor machine tomorrow morning. There are 14 widgets.",
      },
    ],
  },
  {
    n: 476,
    subject: "Request: scheduled exports to SFTP",
    contact: "con-emily",
    assignee: "agt-olivia",
    team: "team-success",
    status: "on_hold",
    priority: "low",
    type: "feature_request",
    category: "product",
    source: "portal",
    tags: ["feature-request", "export"],
    thread: [
      {
        ago: 4 * D,
        from: "c",
        body:
          "Our finance team would like daily sales exports pushed automatically to our SFTP server instead of downloading them manually. Is this on the roadmap?",
      },
      {
        ago: 3 * D + 20 * H,
        from: "a:agt-olivia",
        body:
          "Hi Emily,\n\nThanks for the detailed request. Scheduled delivery to SFTP isn't available today, but I've shared your use case with our product team, who are scoping export destinations for Q1.\n\nI'll keep this ticket on hold and update you as soon as there's a confirmed timeline.",
      },
      {
        ago: 3 * D + 19 * H,
        from: "n:agt-olivia",
        body: "Linked to product request PR-118 (export destinations). Northstar renewal is in January — worth flagging to the account manager.",
      },
    ],
    events: [{ ago: 3 * D + 20 * H, type: "status_changed", description: "Status changed from Open to On Hold", actor: "Olivia Thomas" }],
  },
  {
    n: 475,
    subject: "Password reset email not received",
    contact: "con-ravi",
    assignee: "agt-sarah",
    team: "team-tech",
    status: "resolved",
    priority: "medium",
    type: "question",
    category: "account",
    source: "chat",
    tags: ["login", "email-delivery"],
    resolvedAgo: 20 * H,
    thread: [
      { ago: 1 * D, from: "c", body: "I requested a password reset three times but nothing has arrived. I've checked spam too." },
      {
        ago: 1 * D - 6,
        from: "a:agt-sarah",
        body:
          "Hi Ravi, I can see the reset emails were blocked by your mail provider as a soft bounce. I've cleared the suppression on your address and sent a fresh link — it should arrive within a couple of minutes.",
      },
      { ago: 1 * D - 15, from: "c", body: "Got it, I'm back in. Thanks for the quick help!" },
    ],
  },
  {
    n: 474,
    subject: "Payment method update fails with \"card declined\" error",
    contact: "con-jwilson",
    assignee: "agt-emma",
    team: "team-billing",
    status: "open",
    priority: "high",
    type: "incident",
    category: "billing",
    source: "web_form",
    tags: ["billing", "payments"],
    thread: [
      {
        ago: 7 * H,
        from: "c",
        body:
          "I'm trying to replace our company card before the current one expires at the end of the month. Every attempt shows \"Card declined\", but our bank says no authorisation attempts are reaching them.",
        files: [["card-error.png", 318_464, "image/png"]],
      },
    ],
  },
  {
    n: 473,
    subject: "CSV import skips rows with special characters",
    contact: "con-hannah",
    assignee: "agt-sarah",
    team: "team-tech",
    status: "open",
    priority: "medium",
    type: "problem",
    category: "technical",
    source: "email",
    tags: ["import", "data-quality"],
    thread: [
      {
        ago: 1 * D + 2 * H,
        from: "c",
        body:
          "When we import our carrier list, any row with accented characters (e.g. \"Société Générale Fret\") is skipped without an error. 37 of 412 rows were dropped in yesterday's import.",
        files: [["carriers-sample.csv", 24_576, "text/csv"]],
      },
      {
        ago: 1 * D,
        from: "a:agt-sarah",
        body:
          "Hi Hannah,\n\nThanks for the sample file. Could you confirm which encoding the file is saved in? If it's exported from Excel it's often Windows-1252 rather than UTF-8, which would explain the skipped rows.\n\nIn the meantime, saving as \"CSV UTF-8\" in Excel should let the import pick up every row.",
      },
      {
        ago: 2 * H,
        from: "c",
        body:
          "We re-saved it as CSV UTF-8 and the import now brings in all rows, but the accented characters display as \"Soci?t?\" in the carrier table. Is there a way to fix the rows that were already imported?",
      },
    ],
  },
  {
    n: 472,
    subject: "Need audit log export for compliance review",
    contact: "con-aaron",
    assignee: "agt-sarah",
    team: "team-tech",
    status: "pending",
    priority: "high",
    type: "task",
    category: "security",
    source: "email",
    tags: ["compliance", "audit-log"],
    thread: [
      {
        ago: 2 * D,
        from: "c",
        body:
          "Our annual HIPAA review starts next week. We need a full export of admin audit log events for the past 12 months, including permission changes and data exports.",
      },
      {
        ago: 2 * D - 40,
        from: "a:agt-sarah",
        body:
          "Hi Aaron,\n\nHappy to help. Audit log exports over 90 days are generated by our security team and delivered via a secure link. To start the request, could you confirm:\n\n- The workspace ID(s) to include\n- The email address that should receive the secure link\n\nOnce I have those, delivery usually takes 1–2 business days.",
      },
    ],
  },
  {
    n: 471,
    subject: "Mobile app crashes when opening shared dashboards",
    contact: "con-priya",
    assignee: "agt-daniel",
    team: "team-tech",
    status: "open",
    priority: "high",
    type: "incident",
    category: "technical",
    source: "social",
    tags: ["mobile", "crash"],
    thread: [
      {
        ago: 9 * H,
        from: "c",
        body:
          "Since updating to app version 5.2 on iOS 18, tapping any dashboard shared via link closes the app immediately. Dashboards opened from the home screen work fine.",
      },
      {
        ago: 8 * H + 20,
        from: "a:agt-daniel",
        body:
          "Hi Priya, thanks for the clear steps to reproduce. I can reproduce this on iOS 18 with version 5.2 and have escalated it to our mobile team. As a workaround, opening the shared link in Safari will load the dashboard in the browser.",
      },
    ],
  },
  {
    n: 470,
    subject: "Upgrade from Growth to Enterprise plan",
    contact: "con-tom",
    assignee: "agt-emma",
    team: "team-billing",
    status: "pending",
    priority: "medium",
    type: "question",
    category: "billing",
    source: "phone",
    tags: ["upgrade"],
    thread: [
      {
        ago: 2 * D,
        from: "c",
        body:
          "Phone call with Tom Becker: Orion wants to move to the Enterprise plan from November 1 to get SSO and audit logs. Asked whether unused Growth credit carries over and for a quote for 180 seats.",
      },
      {
        ago: 2 * D - 2 * H,
        from: "a:agt-emma",
        body:
          "Hi Tom,\n\nThanks for the call earlier. I've attached the Enterprise quote for 180 seats. Unused Growth credit is applied pro-rata to the first Enterprise invoice.\n\nOnce you're happy with the quote, reply with your PO number and I'll schedule the change for November 1.",
        files: [["orion-enterprise-quote.pdf", 512_000, "application/pdf"]],
      },
    ],
  },
  {
    n: 469,
    subject: "API rate limit errors during nightly sync",
    contact: "con-dbrooks",
    assignee: "agt-james",
    team: "team-integrations",
    status: "on_hold",
    priority: "high",
    type: "problem",
    category: "integration",
    source: "api",
    tags: ["api", "rate-limit"],
    related: [479],
    thread: [
      {
        ago: 3 * D,
        from: "c",
        body:
          "Our nightly sync job (about 60k records) has started hitting 429 Too Many Requests around the 40k mark. We're already respecting the Retry-After header.",
      },
      {
        ago: 3 * D - 1 * H,
        from: "a:agt-james",
        body:
          "Hi Daniel,\n\nThanks for the details. Your workspace is on the default limit of 600 requests/minute. I've asked our platform team about a temporary increase while we look at moving your sync to the bulk endpoint, which handles 1,000 records per request.\n\nI'll keep this on hold until platform responds.",
      },
      {
        ago: 2 * D,
        from: "n:agt-james",
        body: "Platform ticket PLAT-4471 open for the limit increase. ETA end of week.",
      },
    ],
    events: [{ ago: 3 * D - 1 * H, type: "status_changed", description: "Status changed from Open to On Hold", actor: "James Anderson" }],
  },
  {
    n: 468,
    subject: "Report totals don't match source data",
    contact: "con-michael",
    assignee: "agt-sarah",
    team: "team-tech",
    status: "resolved",
    priority: "medium",
    type: "problem",
    category: "reporting",
    source: "email",
    tags: ["reporting", "data-quality"],
    related: [482],
    resolvedAgo: 2 * D,
    thread: [
      {
        ago: 5 * D,
        from: "c",
        body: "The revenue total on our weekly report is $1,240 lower than the sum of the underlying orders. Can you check?",
      },
      {
        ago: 5 * D - 2 * H,
        from: "a:agt-sarah",
        body:
          "Hi Michael,\n\nThe difference comes from three refunded orders that are excluded from the report total but still appear in the order list. You can switch \"Include refunds\" on in the report filters to match the raw data.",
      },
      { ago: 2 * D + 1 * H, from: "c", body: "That explains it — the totals match now. Thanks Sarah." },
    ],
  },
  {
    n: 467,
    subject: "Remove former employee's access",
    contact: "con-priya",
    assignee: "agt-olivia",
    team: "team-success",
    status: "closed",
    priority: "medium",
    type: "task",
    category: "security",
    source: "portal",
    tags: ["user-management", "offboarding"],
    resolvedAgo: 5 * D + 20 * H,
    thread: [
      {
        ago: 6 * D,
        from: "c",
        body:
          "Please remove access for a contractor whose engagement ended yesterday and transfer ownership of their saved reports to me.",
      },
      {
        ago: 5 * D + 21 * H,
        from: "a:agt-olivia",
        body:
          "Hi Priya, done — the account is deactivated and 12 saved reports have been transferred to you. Their API tokens were revoked as part of the deactivation.",
      },
    ],
  },
  {
    n: 466,
    subject: "Two-factor codes rejected after phone change",
    contact: "con-sophia",
    assignee: "agt-sarah",
    team: "team-tech",
    status: "open",
    priority: "high",
    type: "incident",
    category: "security",
    source: "chat",
    tags: ["2fa", "login"],
    thread: [
      {
        ago: 55,
        from: "c",
        body:
          "I moved my authenticator app to a new phone and now every 6-digit code is rejected. I've lost access to the admin console and need to approve a shift schedule within the hour.",
      },
    ],
  },
  {
    n: 465,
    subject: "Tax ID missing from invoices",
    contact: "con-marcus",
    assignee: "agt-emily",
    team: "team-billing",
    status: "resolved",
    priority: "low",
    type: "task",
    category: "billing",
    source: "email",
    tags: ["invoice", "tax"],
    resolvedAgo: 1 * D + 4 * H,
    thread: [
      { ago: 3 * D, from: "c", body: "Our auditors need our VAT number shown on every invoice. Can you add it and reissue the last three?" },
      {
        ago: 2 * D + 20 * H,
        from: "a:agt-emily",
        body:
          "Hi Marcus,\n\nI've added your VAT number to the billing profile and reissued invoices for July, August and September — you'll find them under Billing → Invoices.",
      },
    ],
  },
  {
    n: 464,
    subject: "Salesforce sync creating duplicate contacts",
    contact: "con-emily",
    assignee: "agt-james",
    team: "team-integrations",
    status: "open",
    priority: "high",
    type: "problem",
    category: "integration",
    source: "email",
    tags: ["salesforce", "sync", "duplicates"],
    thread: [
      {
        ago: 2 * D,
        from: "c",
        body:
          "Since Monday, every Salesforce sync creates a new copy of contacts that already exist. We now have around 800 duplicates.",
      },
      {
        ago: 2 * D - 45,
        from: "a:agt-james",
        body:
          "Hi Emily,\n\nI've paused the Salesforce sync for your workspace to stop further duplicates. It looks like the matching field changed from Email to Contact ID after your Salesforce admin updated the field mapping. I'm preparing a cleanup script to merge the duplicates.",
      },
      {
        ago: 5 * H,
        from: "c",
        body: "Any update on the cleanup? Our sales team is asking when the sync will be back on.",
      },
    ],
  },
  {
    n: 463,
    subject: "Feature request: dark mode for dashboards",
    contact: "con-grace",
    assignee: null,
    team: "team-success",
    status: "open",
    priority: "low",
    type: "feature_request",
    category: "product",
    source: "social",
    tags: ["feature-request"],
    thread: [
      {
        ago: 5 * H,
        from: "c",
        body: "Our staff use the dashboards on wall displays in dim rooms. A dark theme would make them much easier to read.",
      },
    ],
  },
  {
    n: 462,
    subject: "Cannot share report with external stakeholders",
    contact: "con-hannah",
    assignee: "agt-daniel",
    team: "team-tech",
    status: "open",
    priority: "medium",
    type: "question",
    category: "reporting",
    source: "portal",
    tags: ["sharing", "permissions"],
    thread: [
      {
        ago: 6 * H,
        from: "c",
        body: "The \"Share externally\" option is greyed out on our carrier performance report. We need to send it to two partners.",
      },
      {
        ago: 5 * H + 15,
        from: "a:agt-daniel",
        body:
          "Hi Hannah, external sharing is disabled by default on Growth workspaces. A workspace admin can enable it under Settings → Security → External sharing. Once enabled, the option will appear on the report.",
      },
      {
        ago: 1 * H + 10,
        from: "c",
        body: "Our admin enabled it, but the option is still greyed out for me. I'm an Editor on the report — do I need a different role?",
      },
    ],
  },
  {
    n: 461,
    subject: "Bulk user invite emails bounced",
    contact: "con-jwilson",
    assignee: null,
    team: "team-success",
    status: "open",
    priority: "medium",
    type: "problem",
    category: "account",
    source: "email",
    tags: ["email-delivery", "onboarding"],
    frDueIn: 58,
    thread: [
      {
        ago: 3 * H,
        from: "c",
        body:
          "We invited 25 new team members this morning and 9 invitations bounced. The addresses are correct — they receive other external email fine.",
        files: [["bounced-invites.csv", 3_072, "text/csv"]],
      },
    ],
  },
  {
    n: 460,
    subject: "Data retention settings for patient records",
    contact: "con-sophia",
    assignee: "agt-olivia",
    team: "team-success",
    status: "on_hold",
    priority: "medium",
    type: "question",
    category: "security",
    source: "email",
    tags: ["compliance", "data-retention"],
    thread: [
      {
        ago: 8 * D,
        from: "c",
        body:
          "Can we configure automatic deletion of patient-identifiable fields after 7 years? Our legal team needs to confirm before we import historical records.",
      },
      {
        ago: 7 * D + 20 * H,
        from: "a:agt-olivia",
        body:
          "Hi Sophia,\n\nRetention policies can be set per dataset under Settings → Data → Retention. Field-level deletion requires our Data Governance add-on. I've shared the add-on documentation and will hold this ticket until your legal team has reviewed it.",
      },
    ],
    events: [{ ago: 7 * D + 20 * H, type: "status_changed", description: "Status changed from Open to On Hold", actor: "Olivia Thomas" }],
  },
  {
    n: 458,
    subject: "Scheduled report emails sent at wrong time zone",
    contact: "con-laura",
    assignee: "agt-sarah",
    team: "team-tech",
    status: "pending",
    priority: "low",
    type: "problem",
    category: "reporting",
    source: "web_form",
    tags: ["reporting", "timezone"],
    thread: [
      { ago: 2 * D + 4 * H, from: "c", body: "Our 7:00 AM shift report arrives at 2:00 AM. Our workspace is set to Central Time." },
      {
        ago: 2 * D + 1 * H,
        from: "a:agt-sarah",
        body:
          "Hi Laura,\n\nScheduled reports use the time zone of the person who created the schedule, not the workspace. Could you check the schedule owner's profile time zone? If it's set to UTC, updating it will fix future sends.",
      },
    ],
  },
  {
    n: 455,
    subject: "Refund request for unused seats",
    contact: "con-jwilson",
    assignee: "agt-emma",
    team: "team-billing",
    status: "closed",
    priority: "low",
    type: "question",
    category: "billing",
    source: "phone",
    tags: ["billing", "refund-request"],
    resolvedAgo: 11 * D,
    thread: [
      { ago: 12 * D, from: "c", body: "Phone call: James asked whether the 5 seats removed last month can be refunded for the remainder of the annual term." },
      {
        ago: 11 * D + 2 * H,
        from: "a:agt-emma",
        body:
          "Hi James,\n\nAs discussed, unused seats on annual plans are credited rather than refunded. I've applied a credit of $375 to your account, which will be used against your next invoice.",
      },
    ],
  },
  {
    n: 391,
    subject: "Export report timeout",
    contact: "con-michael",
    assignee: "agt-sarah",
    team: "team-tech",
    status: "closed",
    priority: "high",
    type: "incident",
    category: "reporting",
    source: "email",
    tags: ["reporting", "export"],
    related: [482, 284],
    resolvedAgo: 19 * D,
    thread: [
      {
        ago: 21 * D,
        from: "c",
        body: "Exporting the quarterly report times out after a minute. Smaller date ranges export fine.",
      },
      {
        ago: 21 * D - 21,
        from: "a:agt-sarah",
        body:
          "Thanks for reporting this. I'll check the export configuration on your workspace and come back to you shortly.",
      },
      {
        ago: 20 * D,
        from: "a:agt-sarah",
        body:
          "Hi Michael,\n\nLarge exports from the legacy reporting module can exceed the 60-second limit. I've enabled asynchronous exports for your workspace — large reports will now be emailed to you as a download link when they're ready.",
      },
      { ago: 19 * D + 2 * H, from: "c", body: "The quarterly export arrived by email this morning. Thanks!" },
    ],
  },
  {
    n: 284,
    subject: "Reporting module issue",
    contact: "con-priya",
    assignee: "agt-daniel",
    team: "team-tech",
    status: "closed",
    priority: "medium",
    type: "problem",
    category: "reporting",
    source: "portal",
    tags: ["reporting"],
    related: [391],
    resolvedAgo: 45 * D,
    thread: [
      { ago: 48 * D, from: "c", body: "Some charts in the reporting module show \"No data\" even though the filters return rows in the table view." },
      {
        ago: 47 * D + 20 * H,
        from: "a:agt-daniel",
        body:
          "Hi Priya, this was caused by a caching issue in the legacy reporting module that our engineers fixed in last night's release. Could you refresh and let me know if the charts load now?",
      },
      { ago: 45 * D + 3 * H, from: "c", body: "All charts are loading correctly now. Thanks." },
    ],
  },
];

export const ticketNumber = (n: number) => `DK-2026-${String(n).padStart(5, "0")}`;

const AGENT_BY_ID = new Map(AGENTS.map((a) => [a.id, a]));
const CONTACT_BY_ID = new Map(CONTACTS.map((c) => [c.id, c]));
const TEAM_BY_ID = new Map(TEAMS.map((t) => [t.id, t]));

const STATUS_TEXT: Record<TicketStatus, string> = {
  open: "Open",
  pending: "Pending",
  on_hold: "On Hold",
  resolved: "Resolved",
  closed: "Closed",
};

/** Builds the in-memory ticket store with timestamps anchored to `now`. */
export function buildTickets(now: number): TicketRecord[] {
  const at = (ago: number) => new Date(now - ago * 60_000).toISOString();

  return SEEDS.map((seed) => {
    const id = ticketNumber(seed.n);
    const contact = CONTACT_BY_ID.get(seed.contact)!;
    const createdAgo = seed.thread[0].ago;
    let fileSeq = 0;

    const messages: TicketMessage[] = seed.thread.map((m, i) => {
      const [kind, ref] = m.from.split(":");
      const isCustomer = kind === "c";
      const person = isCustomer ? CONTACT_BY_ID.get(ref ?? seed.contact)! : AGENT_BY_ID.get(ref)!;
      const channel: TicketSource = isCustomer
        ? seed.source
        : seed.source === "chat" || seed.source === "social"
          ? seed.source
          : "email";
      const attachments: Attachment[] = (m.files ?? []).map(([name, size, mimeType]) => ({
        id: `${id}-f${++fileSeq}`,
        name,
        size,
        mimeType,
      }));
      return {
        id: `${id}-m${i + 1}`,
        author: {
          id: person.id,
          name: person.name,
          role: isCustomer ? "Customer" : (person as (typeof AGENTS)[number]).role,
          avatar: person.avatar,
        },
        authorType: isCustomer ? "customer" : "agent",
        body: m.body,
        timestamp: at(m.ago),
        visibility: kind === "n" ? "internal" : "public",
        channel,
        attachments,
      };
    });

    // Activity: explicit events + those implied by the thread and the current state.
    const events: EventSeed[] = [
      {
        ago: createdAgo,
        type: "created",
        description: `Ticket created via ${channelLabel(seed.source)}`,
        actor: contact.name,
      },
      ...(seed.events ?? []),
    ];
    const assignee = seed.assignee ? AGENT_BY_ID.get(seed.assignee)! : null;
    if (assignee && !events.some((e) => e.type === "assigned")) {
      events.push({
        ago: createdAgo - 3,
        type: "assigned",
        description: `Assigned to ${assignee.name}`,
        actor: "Auto-assignment",
      });
    }
    seed.thread.forEach((m, i) => {
      if (i === 0) return;
      const [kind, ref] = m.from.split(":");
      if (kind === "c") {
        events.push({ ago: m.ago, type: "customer_replied", description: "Customer replied", actor: CONTACT_BY_ID.get(ref ?? seed.contact)!.name });
      } else if (kind === "a") {
        events.push({ ago: m.ago, type: "agent_replied", description: "Public reply sent", actor: AGENT_BY_ID.get(ref)!.name });
      } else {
        events.push({ ago: m.ago, type: "note_added", description: "Internal note added", actor: AGENT_BY_ID.get(ref)!.name });
      }
    });
    if (seed.status === "pending" && !events.some((e) => e.type === "status_changed")) {
      const lastAgent = [...seed.thread].reverse().find((m) => m.from.startsWith("a:"));
      if (lastAgent) {
        events.push({
          ago: lastAgent.ago - 1,
          type: "status_changed",
          description: "Status changed from Open to Pending",
          actor: AGENT_BY_ID.get(lastAgent.from.split(":")[1])!.name,
        });
      }
    }
    if (seed.resolvedAgo !== undefined) {
      const resolver = assignee?.name ?? "System";
      events.push({ ago: seed.resolvedAgo, type: "status_changed", description: "Status changed from Open to Resolved", actor: resolver });
      if (seed.status === "closed") {
        events.push({
          ago: Math.max(seed.resolvedAgo - 2 * D, 1),
          type: "status_changed",
          description: `Status changed from Resolved to ${STATUS_TEXT.closed}`,
          actor: "Auto-close rule",
        });
      }
    }

    const activities: TicketActivity[] = events
      .sort((a, b) => b.ago - a.ago)
      .map((e, i) => ({ id: `${id}-a${i + 1}`, type: e.type, description: e.description, actor: e.actor, timestamp: at(e.ago) }));

    const firstAgentReply = seed.thread.find((m) => m.from.startsWith("a:"));
    const lastPublic = [...seed.thread].reverse().find((m) => !m.from.startsWith("n:"))!;
    const latestAgo = Math.min(...events.map((e) => e.ago), ...seed.thread.map((m) => m.ago));
    const policy = SLA_POLICY[seed.priority];

    return {
      id,
      ticketNumber: id,
      subject: seed.subject,
      description: seed.thread[0].body,
      status: seed.status,
      priority: seed.priority,
      type: seed.type,
      category: seed.category,
      source: seed.source,
      customerId: contact.customerId,
      contactId: contact.id,
      assigneeId: seed.assignee,
      teamId: TEAM_BY_ID.get(seed.team)!.id,
      sla: {
        firstResponseDue: seed.frDueIn !== undefined ? at(-seed.frDueIn) : at(createdAgo - policy.firstResponse),
        resolutionDue: seed.resDueIn !== undefined ? at(-seed.resDueIn) : at(createdAgo - policy.resolution),
        firstRespondedAt: firstAgentReply ? at(firstAgentReply.ago) : null,
        resolvedAt: seed.resolvedAgo !== undefined ? at(seed.resolvedAgo) : null,
      },
      tags: seed.tags,
      createdAt: at(createdAgo),
      updatedAt: at(latestAgo),
      lastReplyAt: at(lastPublic.ago),
      messages,
      activities,
      relatedTicketIds: (seed.related ?? []).map(ticketNumber),
      followerIds: seed.followers ?? [],
    };
  });
}

function channelLabel(source: TicketSource) {
  return { email: "Email", web_form: "Web Form", chat: "Chat", phone: "Phone", portal: "Portal", api: "API", social: "Social" }[source];
}

/** Tags agents reach for most often — offered as suggestions in tag pickers. */
export const SUGGESTED_TAGS = [
  "billing",
  "export",
  "reporting",
  "urgent",
  "customer-impact",
  "login",
  "api",
  "feature-request",
  "data-quality",
  "follow-up",
];

/** Canned responses for the reply composer. */
export const SAVED_REPLIES = [
  {
    id: "sr-ack",
    title: "Acknowledge & investigating",
    body: "Thanks for reaching out, and sorry for the trouble. I'm looking into this now and will update you as soon as I know more.",
  },
  {
    id: "sr-more-info",
    title: "Request more information",
    body: "To help us investigate, could you share:\n\n- The steps you took before the issue appeared\n- A screenshot of any error message\n- The approximate time it happened",
  },
  {
    id: "sr-escalated",
    title: "Escalated to engineering",
    body: "I've escalated this to our engineering team with all the details you've provided. I'll keep this ticket updated and let you know as soon as there's progress.",
  },
  {
    id: "sr-resolved",
    title: "Resolved — confirm with customer",
    body: "This should now be resolved. Could you confirm everything is working as expected on your side? If anything still looks off, just reply to this email and the ticket will reopen.",
  },
];
